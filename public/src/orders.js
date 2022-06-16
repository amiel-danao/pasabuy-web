'use strict';
import { database, toggleLoading, dateformat, PESO, firebaseTimeStampToDateString, logout, checkCredential } from './index.js';
import { writeBatch, collection, query, where, onSnapshot, setDoc, doc, updateDoc, increment } from "firebase/firestore";

var orderTable;
const stateColors = ["badge bg-info", "badge bg-primary", "badge bg-warning", "badge bg-success", "badge bg-danger"];
const stateTexts = ["Pending", "Processing", "On Delivery", "Received", "Cancelled"];
const stateVariables = ["pendingOrders", "processingOrders", "onDeliveryOrders", "receivedOrders", "cancelledOrders"];
const orderCheckBoxTemplate = '<label class="customcheckbox"><input type="checkbox" class="listCheckbox" /><span class="checkmark"></span></label>';
const editButtontemplate = `<button type="button" class="btn btn-info editOrderButton" data-bs-toggle="modal" data-bs-target="#editOrderModal">Edit <i class="fas fa-edit"></i></button>`;
var selectedOrder;
var updatedOrder;
var unsubscribe;

var showCancelled = false;

checkCredential();

$(function(){
    initializeOrderTable();
    attachEventListeners();    
    attachOrderTableListener();
});

function attachEventListeners(){
    const form = document.getElementById('editOrderForm');
    $("#logout").on('click', logout);
    form.addEventListener('submit', saveOrder);
    $("#zero_config tbody").on("click", ".editOrderButton", function(){
        let data = orderTable.row(this.parentNode).data();
        selectedOrder = data;
        updatedOrder = Object.assign({}, selectedOrder);
        console.log(selectedOrder);
    });
    
    $("#zero_config tbody").on("click", ".deleteOrderButton", function(){
        let thisTr = $(this).closest('tr');
        let selectedRows = $('.listCheckbox[type=checkbox]:checked');
        let selectedIds = new Array();

        selectedIds.push(thisTr.attr('id'));

        selectedRows.each(function(){
            let thisId = $(this).closest('tr').attr('id');
            if(!selectedIds.includes(thisId)){
                selectedIds.push(thisId);
            }
        });

        console.table(selectedIds);
        bootbox.confirm("Are you sure you want to delete the selected order(s)?", function(result){ 
            if(result){
                deleteOrder(selectedIds);                  
            }
        });
    });

    var myModalEl = document.getElementById('editOrderModal');
    myModalEl.addEventListener('shown.bs.modal', function (event) {
        formDeserialize(form, selectedOrder);
    });
    
    form.addEventListener("change", function(event){
        console.log(event.target);
        let newValue = event.target.value;
        let propertyName = $(event.target).attr('name');
        let dataType = $(event.target).data('type');
        // TODO: process newValue based on data type
        if(dataType == "int"){
            newValue = parseInt(newValue);
        }
        
        updatedOrder[propertyName] = newValue;
    });
}

async function deleteOrder(orderIds){
    toggleLoading('', true);
    const batch = writeBatch(database);

    for(var i=0; i<orderIds.length; i++){
        let thisOrderId = orderIds[i];
        batch.set(doc(database, "orders", thisOrderId), {deleted:true}, { merge: true });
    }
    
    await batch.commit()
    .then(function() {
        console.log("Order(s) was deleted successfully!");
        toggleLoading('', false);
        orderTable.draw();
    })
    .catch(error => {
        toggleLoading('', false);
        bootbox.alert(error);
    });
}

function formDeserialize(form, data) {
    const entries = (new URLSearchParams(data)).entries();
    for(const [key, val] of entries) {
        //http://javascript-coder.com/javascript-form/javascript-form-value.phtml
		let newKey = key;
		
		if(newKey == "items"){
			newKey = "total_price";
		}
        const input = form.elements[newKey];
        if(input == null){
            continue;
        }
        
        let proxyLabel = $(form).find("p[data-proxy='"+input.id+"']");
        if($(input).hasClass('dateClass')){
            console.log(data[newKey]);
            if(proxyLabel != null){
                proxyLabel.text(firebaseTimeStampToDateString(data[newKey]));
            }
        }

		console.log($(input));
        if($(input).hasClass('currency')){
			console.log(data[key]);
			let totalPrice = 0;
			for(var i=0; i<data[key].length; i++){
				totalPrice += parseFloat(data[key][i].price.replace('₱', ''));
			}
            if(proxyLabel != null){
				//console.log(data[newKey]);
                proxyLabel.text(PESO(totalPrice).format());
            }
        }

        switch(input.type) {
            case 'checkbox': input.checked = !!val; break;
            default:         input.value = val;     break;
        }
    }
}

function initializeOrderTable(){
    $('#zero_config thead tr')
    .clone(true)
    .addClass('filters')
    .appendTo('#zero_config thead');

    orderTable = $("#zero_config").DataTable({
        fixedHeader: true,
        initComplete: filterFunction,
		dom: 'Bfrtip',
        buttons: [
            {
                text: 'show/hide cancelled',
                action: function ( e, dt, node, config ) {
					showCancelled = !showCancelled;
					attachOrderTableListener();
                }
            }
        ],
        columnDefs: [
            {
                orderable: false, targets: 0                
            },
            {
                render: function ( data, type, row ) {
                    return firebaseTimeStampToDateString(data);
                },
                targets: 2
            }
        ],
        order: [[1, 'asc']],
        columns: [
            { defaultContent: orderCheckBoxTemplate},
            { data: 'id' },
            { data: 'createdAt' },
            { 
                data: 'state',
                render: function(data, type) {
                    return `<span class="${stateColors[data]}">${stateTexts[data]}</span>`;
                }
            },
            { data: 'items',
                render: (data, type)=>{
					let totalPrice = 0;
					if(data != undefined){
						console.log(data);
						for(var i=0; i<data.length; i++){
							totalPrice += parseFloat(data[i].price.replace('₱', ''));
						}
					}
					else{
						console.log(`data is undefined : type==${type}`);
					}
					
                    return PESO(totalPrice).format();
                }
            },
            { data: 'restaurantName' },
            { defaultContent: editButtontemplate}
        ],
        createdRow: function( row, data, dataIndex ) {            
            row.id = data.id;
			console.log(row);
        }
    });
}

function attachOrderTableListener(){
	orderTable.clear();
	if(unsubscribe != null){
		unsubscribe();
	}
	
    var q = query(collection(database, "orders").withConverter(orderConverter));
	
	

    unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
            let order = change.doc.data();
            if(order['state'] == undefined){
                order['state'] = 0;
            }
						
			if((showCancelled == false && order['state'] != 4) || (showCancelled && order['state'] == 4)){
				orderTable.row.add(order).draw();
				console.log(order);
			}
        }
        if (change.type === "modified") {
            console.log("Modified order: ", change.doc.data());
            orderTable.row('#'+change.doc.id).data( change.doc.data() ).draw();
        }
        if (change.type === "removed") {
            console.log("Removed order: ", change.doc.data());
            orderTable.row(`#${change.doc.id}`).remove().draw();
        }

        attachCheckBoxListener();
      });
    });
}

function attachCheckBoxListener(){
    $("#allCheckbox").multicheck($(".listCheckbox"));
}

async function saveOrder(event) {
    event.preventDefault();
    toggleLoading('Saving order...', true);
    console.log(selectedOrder);
    console.log(updatedOrder);

    let orderId = $("#orderId").val();
    await setDoc(doc(database, "orders", orderId), Object.assign({}, updatedOrder))
    .then(function() {
        console.log("Order was updated successfully!");
        $('#editOrderModal').modal('hide');        
        toggleLoading('', false);

        if(selectedOrder.state != updatedOrder.state){
            updateOrderStateCounter(selectedOrder.state, updatedOrder.state);
        }
    })
    .catch(error => {
        toggleLoading('', false);
        bootbox.alert(error);
    });
}

async function updateOrderStateCounter(previousStateIndex, currentStateIndex){
    const ref = doc(database, "settings", "counters");
    let previousState = stateVariables[previousStateIndex];
    let currentState = stateVariables[currentStateIndex];
    let updateCounter = {};
    updateCounter[previousState] = increment(-1);
    updateCounter[currentState] = increment(1);

    await updateDoc(ref, updateCounter);
}

class Order {
    constructor(id, date, state, restaurantName, items) {
        this.id = id;
        this.restaurantName = restaurantName;
        this.state = state;
        this.createdAt = date;
        this.items = items;
    }
};

// Firestore data converter
const orderConverter = {
    toFirestore: (order) => {
        return order;
    },
    fromFirestore: (snapshot, options) => {
        const data = snapshot.data(options);
        return new Order(snapshot.id, data.createdAt, data.state,  
            data.restaurantName, data.items);
    }
};

function filterFunction() {
    var api = this.api();

    // For each column
    api
        .columns()
        .eq(0)
        .each(function (colIdx) {
            if(colIdx != 0){
                // Set the header cell to contain the input element
                var cell = $('.filters th').eq(
                    $(api.column(colIdx).header()).index()
                );
                var title = $(cell).text();

                if(title != "Action"){
                    $(cell).html('<input type="text" placeholder="' + title + '" />');

                    // On every keypress in this input
                    $(
                        'input',
                        $('.filters th').eq($(api.column(colIdx).header()).index())
                    )
                        .off('keyup change')
                        .on('change', function (e) {
                            // Get the search value
                            $(this).attr('title', $(this).val());
                            var regexr = '({search})'; //$(this).parents('th').find('select').val();

                            
                            // Search the column for that value
                            api
                                .column(colIdx)
                                .search(
                                    this.value != ''
                                        ? regexr.replace('{search}', '(((' + this.value + ')))')
                                        : '',
                                    this.value != '',
                                    this.value == ''
                                )
                                .draw();
                        })
                        .on('keyup', function (e) {
                            e.stopPropagation();

                            var cursorPosition = this.selectionStart;

                            $(this).trigger('change');
                            $(this)
                                .focus()[0]
                                .setSelectionRange(cursorPosition, cursorPosition);
                        });
                }
            }
        });
}

window.onbeforeunload = function (e) {
    e = e || window.event;

    // For IE and Firefox prior to version 4
    if (e) {
        e.returnValue = 'Sure?';
    }

    // For Safari
    return 'Sure?';
};