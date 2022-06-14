'use strict';
import { database, toggleLoading, dateformat, PESO, firebaseTimeStampToDateString, logout, checkCredential } from './index.js';
import { collection, query, where, onSnapshot, setDoc, doc, Timestamp} from "firebase/firestore";
import { getStorage, ref, uploadBytes, listAll, getDownloadURL } from "firebase/storage";

const editButtontemplate = `<button type="button" class="btn btn-info imageEdit image-popup-vertical-fit el-link" href="javascript:void(0);"
data-bs-toggle="modal" data-bs-target="#manageImageModal"><i class="fas fa-images"></i></button>
                            <button type="button" class="btn btn-danger itemEdit"  href="javascript:void(0);" data-bs-toggle="modal" data-bs-target="#editItemModal">Edit<i class="fas fa-edit" aria-hidden="true"></i></button>`;
const defaultNoImage = `https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/2000px-No_image_available.svg.png`;
const orderCheckBoxTemplate = '<label class="customcheckbox"><input type="checkbox" class="listCheckbox" /><span class="checkmark"></span></label>';
const storage = getStorage();
var modalDialogTrigger;
var uploadItemImage;
var selectedItem;
var updatedItem;
var itemImages = {};
var itemRefs = {};
var itemTable;

checkCredential();

$(function(){
    initializeItemTable();
    attachEventListeners();    
    attachItemTableListener();
});


function initializeItemTable(){
    $('#itemTable thead tr')
    .clone(true)
    .addClass('filters')
    .appendTo('#itemTable thead');

    itemTable = $("#itemTable").DataTable({
        fixedHeader: true,
        initComplete: filterFunction,
        columnDefs: [
            {
                orderable: false, targets: 0                
            },
            {
                render: function ( data, type, row ) {
                    let obj = row;
                    return getPricesTextTemplate(obj);
                },
                targets: 3
            },
            {
                render: function ( data, type, row ) {
                    let obj = row;
                    console.log(row);
                    return getQuantityTextTemplate(obj);
                },
                targets: 4
            }
            
        ],
        order: [[1, 'asc']],
        columns: [
            { defaultContent: orderCheckBoxTemplate},
            { data: 'id' },
            { data: 'name' },
            { data: 'price'},
            { 
                data: 'quantity'
            },            
            { data: 'restaurantName' },
            { defaultContent: editButtontemplate}
        ],
        createdRow: function( row, data, dataIndex ) {            
            row.id = data.id;
        }
    });
}

function attachEventListeners(){
    $("#logout").on('click', logout);

    uploadItemImage = document.getElementById("uploadItemImage");

    const form = document.getElementById('editItemForm');
    form.addEventListener('submit', saveItem);

    const imageForm = document.getElementById('editImageForm');
    imageForm.addEventListener('submit', saveImages);

    var myModalEl = document.getElementById('editItemModal');
    myModalEl.addEventListener('shown.bs.modal', function (event) {
        console.log(event);

        if(modalDialogTrigger.hasClass('itemEdit')){
            $(this).find(".modal-title").text("Edit item details");
            console.log(modalDialogTrigger.parents('tr'));
            selectedItem = itemTable.row( modalDialogTrigger.parents('tr') ).data();
            console.log(selectedItem);
            
        }
        else{
            let ref = doc(collection(database, "items"));
            let id = ref.id;
            console.log(id);
            selectedItem = new Item(id, "", "", {}, {}, Timestamp.now());
            $(this).find(".modal-title").text("Add new item");
            $('#editItemForm').get(0).reset();
        }
        
        $('#itemEditTable > tbody').empty();
        updatedItem = selectedItem;
        formDeserialize(form, updatedItem);
    });

    var imageModal = document.getElementById("manageImageModal");
    imageModal.addEventListener('shown.bs.modal', function(event){
        console.log(event);
        
        let imageList = itemImages[selectedItem.id];
        console.log(imageList);

        $("#carouselExampleIndicators").find('.carousel-indicators').empty();
        $("#carouselExampleIndicators").find('.carousel-inner').empty();
        let active = 'active';

        for(var i=0; i < imageList.length; i++){
            let imageUrl = imageList[i];

            let imageTemplate = `<div class="carousel-item ${active}">
                <a class="example-image-link" href="${imageUrl}" data-lightbox="${selectedItem.id}">
                    <img class="example-image" src="${imageUrl}" alt="image-1" />
                </a>
            </div>`;

            let indicatorTemplate = `<button type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide-to="${i}" class="${active}" aria-current="true" aria-label="Slide ${i}"></button>`;
            
            $("#carouselExampleIndicators").find('.carousel-indicators').append(indicatorTemplate);
            $("#carouselExampleIndicators").find('.carousel-inner').append(imageTemplate);

            active = '';
        }

        var myCarousel = document.querySelector('#carouselExampleIndicators');
        var carousel = new bootstrap.Carousel(myCarousel);

    });

    $("table").on('click', ".imageEdit", function(){
        selectedItem = itemTable.row( $(this).parents('tr') ).data();
        console.log(selectedItem);
    });

    $("#newItemButton").on('click', function(){
        modalDialogTrigger = $(this);
    });

    
    $("table").on('click', '.itemEdit', function(){
        modalDialogTrigger = $(this);
    });	
	
	$("#addNewVariationButton").on('click', function(){
        bootbox.prompt("Enter variation name!", function(result){ 
            console.log(result);
			if(result != null && result.length > 0){
                const key = result.toLowerCase();
                let existingVariation = $(`input[value="${key}"]`);
                console.log(existingVariation);
                if(existingVariation == undefined || existingVariation == null || existingVariation.length == 0){
				    $("#itemEditTable > tbody").append(getVariationTemplate(key, 0, 0));
                    
                    updatedItem['price'][key] = 0;
                    updatedItem['quantity'][key] = 0;
                }
			}
			else{
				
			}
		});
    });

    $("#itemEditTable").on('click', '.removeVariation', function(){
        let key = $(this).parent().parent().find('.itemVariation').val();
        console.log(`key is ${key}`);
        if(updatedItem.price.hasOwnProperty(key)){
            delete updatedItem.price[key];
            console.log(`updatedItem.price has ${key}`);
        }

        if(updatedItem.quantity.hasOwnProperty(key)){
            delete updatedItem.quantity[key];
        }

        console.log(updatedItem);
        $(this).closest('tr').remove();
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
        
        let elem = $(event.target);
        let key = propertyName;

        if(elem.hasClass('price')){
            key = elem.parent().parent().find('.itemVariation').val();
            updatedItem['price'][key] = parseInt(elem.val());
        }
        else if(elem.hasClass('quantity')){
            key = elem.parent().parent().find('.itemVariation').val();
            updatedItem['quantity'][key] = parseInt(elem.val());
        }
        else if(elem.hasClass('itemVariation')){
            
        }
        else{
            updatedItem[propertyName] = newValue;
        }
    });
}

function getVariationTemplate(name, price, quantity){
	return `<tr class="itemVariationRow">
        <th scope="row"><input type="text" class="text-monospace itemVariation" value="${name}" required></th>
        <td><input type="number" min="0" class="text-monospace currency price" data-type="int" value="${price}" required></td>
        <td><input type="number" min="0" class="text-monospace quantity" data-type="int" value="${quantity}" required></td>
        <td><button class="btn btn-danger removeVariation"><i class="fa-solid fa-trash-can"></i></button></td>
    </tr>`;
}

function formDeserialize(form, data) {
    if(data == null)
    {
        bootbox.alert("Item doesn't exists!");
        return;        
    }
    const entries = (new URLSearchParams(data)).entries();
    for(const [key, val] of entries) {
        //http://javascript-coder.com/javascript-form/javascript-form-value.phtml
        const input = form.elements[key];
        if(input == null){
            continue;
        }
        
        /*let proxyLabel = $(form).find("p[data-proxy='"+input.id+"']");

        if($(input).hasClass('currency')){
            if(proxyLabel != null){
                proxyLabel.text(PESO(val).format());
            }
        }*/

        switch(input.type) {
            case 'checkbox': input.checked = !!val; break;
            default:         input.value = val;     break;
        }
    }

    for(const [key, val] of Object.entries(data.price)) {
        let name = key;
        let price = val;
        let quantity = 0;

        if(key in data.quantity){
            quantity = data.quantity[key];
        }

        $("#itemEditTable > tbody").append(getVariationTemplate(name, price, quantity));
    }
}

function updateImagesUI(itemId){
    var listRef = ref(storage, `${itemId}`);
    itemImages[itemId] = new Array();
    itemRefs[itemId] = new Array();
    // Find all the prefixes and items.
    listAll(listRef)
    .then((res) => {
        
        res.items.forEach((itemRef) => {
            itemRefs[itemId].push(itemRef);
            // All the items under listRef.
            getDownloadURL(itemRef)
            .then((url) => {
            // Insert url into an <img> tag to "download"
                itemImages[itemId].push(url);
                // if(itemImages[itemId].length == 1){
                //     $(`#${itemId}`).find(".thumbnailImage").attr('src', url);
                // }
            })
            .catch((error) => {
            // A full list of error codes is available at
            // https://firebase.google.com/docs/storage/web/handle-errors
            console.log(error.message);
            switch (error.code) {
                case 'storage/object-not-found':
                // File doesn't exist
                break;
                case 'storage/unauthorized':
                // User doesn't have permission to access the object
                break;
                case 'storage/canceled':
                // User canceled the upload
                break;
        
                // ...
        
                case 'storage/unknown':
                // Unknown error occurred, inspect the server response
                break;
            }
            });
            

        });
    }).catch((error) => {
        // Uh-oh, an error occurred!
        console.log(error);
    });
}

function attachItemTableListener(){
    
    const q = query(collection(database, "items").withConverter(itemConverter)/*, where("state", "==", "CA")*/);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        // if (change.type === "added") {
        //     //itemTable.row.add(change.doc.data()).draw();
        //     let newData = change.doc.data();
        //     let newElem = getItemTemplate(newData);            
        //     $("#itemThumbnailTable").append(newElem);
        //     $(`#${change.doc.id}`).data('item', newData);

        //     updateImagesUI(change.doc.id);
        // }
        // if (change.type === "modified") {
        //     console.log("Modified order: ", change.doc.data());
        //     let id = change.doc.id;

        //     $(`#${id}`).find('.prices').html(getPricesTextTemplate(change.doc.data()));
        //     $(`#${id}`).find('.quantity').text(getQuantityTextTemplate(change.doc.data()));
        // }
        // if (change.type === "removed") {
        //     console.log("Removed order: ", change.doc.data());
        //     $(`#${change.doc.id}`).remove();
        // }

        if (change.type === "added") {
            itemTable.row.add(change.doc.data()).draw();

            updateImagesUI(change.doc.id)
        }
        if (change.type === "modified") {
            console.log("Modified order: ", change.doc.data());
            itemTable.row('#'+change.doc.id).data( change.doc.data() ).draw();
        }
        if (change.type === "removed") {
            console.log("Removed order: ", change.doc.data());
            itemTable.row(`#${change.doc.id}`).remove().draw();
        }


      });
    });
}

function saveImages(event){
    event.preventDefault();

    if(uploadItemImage.files.length > 0){
        toggleLoading('Saving item...', true);
        Promise.all(
        // Array of "Promises"
        Array.from(uploadItemImage.files).map(item => putStorageItem(item))
        )
        .then((url) => {
            console.log(`All success`);
            toggleLoading('', false);
            bootbox.alert('Upload complete');
            $('#manageImageModal').modal('hide');

            console.log(selectedItem);

            updateImagesUI(selectedItem.id);
        })
        .catch((error) => {
            console.log(`Some failed: `, error.message);
            toggleLoading('', false);
            bootbox.alert(error.message);            
        });
    }
    else{
        $('#manageImageModal').modal('hide');
    }
}

async function putStorageItem(file) {
    // the return value will be a Promise
    let storageRef = ref(storage, `${selectedItem.id}/${file.name}`);
    return uploadBytes(storageRef, file).then((snapshot) => {
        console.log('Uploaded a blob or file!');

        console.log(snapshot);
        //$(`#${selectedItem.id}`).find('.thumbnailImage').attr('src', url);
    }).catch((error) => {
        console.log('One failed:', file, error.message)
    });
  }

function getQuantityTextTemplate(item){
    let quantityText = 0;
    for(const [key, val] of Object.entries(item.quantity)) {
        quantityText += parseInt(val);
    }
    return quantityText;
}

function getPricesTextTemplate(item){
    let pricesText = "";
    for(const [key, val] of Object.entries(item.price)) {
        if(key in item.price){
            let price = item.price[key];
            pricesText += `${key} : ${PESO(price).format()}<br>`;
        }
    }

    return pricesText;
}


function getItemTemplate(item){
    
    var totalQuantity = getQuantityTextTemplate(item);    

    var pricesText = getPricesTextTemplate(item);    

    return `<div id="${item.id}" class="col-lg-3 col-md-6 item-entry">
        <div class="card">
            <div class="el-card-item">
                <div class="el-card-avatar el-overlay-1">
                    <img class="thumbnailImage" src="${defaultNoImage}" alt="image-1" />
                    
                    <div class="el-overlay">
                        <ul class="list-style-none el-info">
                        <li class="el-item">
                            <a class="imageEdit btn default btn-outline image-popup-vertical-fit el-link"
                                href="javascript:void(0);"
                                data-bs-toggle="modal" data-bs-target="#manageImageModal">
                            <i class="fas fa-images"></i></a>
                        </li>
                        <li class="el-item">
                            <a class="btn default btn-outline el-link itemEdit" href="javascript:void(0);" data-bs-toggle="modal" data-bs-target="#editItemModal"><i class="fas fa-edit">edit</i></a>
                        </li>
                        </ul>
                    </div>
                </div>
                <div class="el-card-content">
                
                    <button type="button" class="btn btn-primary position-relative itemEdit" data-bs-toggle="modal" data-bs-target="#editItemModal">
                    ${item.name}
                    <span class="quantity position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                        ${totalQuantity}
                        <span class="visually-hidden">quantity</span>
                    </span>
                    </button>
                    <p class="text-muted currency prices">${pricesText}</p>
                </div>
            </div>
        </div>
    </div>`;
}

async function saveItem(event) {
    event.preventDefault();
    //var validator = $("#editItemForm" ).validate();
    var changeEvent = new Event('change');

    // Dispatch it.
    $("#editItemForm > input").each(function(){
        this.dispatchEvent(changeEvent);
    });
    //validator.form();

    
    toggleLoading('Saving item...', true);
    console.log(updatedItem);


    let itemId = $("#itemId").val();
    await setDoc(doc(database, "items", itemId), Object.assign({}, updatedItem))
    .then(function() {
        console.log("Item was updated successfully!");
        toggleLoading('', false);
        $('#editItemModal').modal('hide');
        
    })
    .catch(error => {
        toggleLoading('', false);
        bootbox.alert(error);
    });
}

class Item {
    constructor(id, name, restaurantName, price, quantity, timestamp) {
        this.id = id;
        this.name = name;
        this.restaurantName = restaurantName;
        this.price = price;
        this.quantity = quantity;
        this.timestamp = timestamp;
    }
};

// Firestore data converter
const itemConverter = {
    toFirestore: (item) => {
        return item;
    },
    fromFirestore: (snapshot, options) => {
        const data = snapshot.data(options);
        return new Item(snapshot.id, data.name, data.restaurantName, data.price, data.quantity, data.timestamp);
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