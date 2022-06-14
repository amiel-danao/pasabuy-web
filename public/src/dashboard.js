'use strict';
import { database, getDoc, logout, checkCredential} from './index.js';
import { collection, query, onSnapshot, getDocs, setDoc, doc, Timestamp} from "firebase/firestore";
import {Chart, registerables } from 'chart.js';
import moment from 'moment';

const counterIds = ['pendingOrders', 'processingOrders', 'onDeliveryOrders', 'receivedOrders', 'totalShops'];
const labels = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];


  const config = {
    type: 'line',
    data: {},
    options: {}
  };

  checkCredential();

$(function(){
    console.log('start dashboard');
    Chart.register(...registerables);
    attachEventListeners();    
    readStatsFromDatabase();
    attachSettingsListener();
});

function attachEventListeners(){
    $("#logout").on('click', logout);
}

async function readStatsFromDatabase(){

	var orderMonths = new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

	const q = query(collection(database, "orders"));

	const querySnapshot = await getDocs(q);
	querySnapshot.forEach((doc) => {
		// doc.data() is never undefined for query doc snapshots
		let order = doc.data();

		if(order['createdAt'] != undefined){
			console.log(doc.id, " => ", order);

			let date = order['createdAt'].toDate();
			let monthIndex = moment(date).month();

			orderMonths[monthIndex]++;
		}
	});

	const data = {
		labels: labels,
		datasets: [{
			label: 'Orders',
			backgroundColor: '#3ef57f',
			borderColor: '#3ef57f',
			data: orderMonths,
		}]
	};

	config.data = data;

	const myChart = new Chart(
		document.getElementById('myChart'),
		config
	);
}

async function attachSettingsListener(){
    const docRef = doc(database, "settings", "counters");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        console.log("Document data:", docSnap.data());
        let data = docSnap.data();

        for(var i=0; i < counterIds.length; i++){
            let key = counterIds[i];
            if(data[key] != undefined){
				let dom = document.getElementById(key);
                if(dom != undefined){
					dom.innerText = data[key];
				}
            }
        }
        
		refreshTotalOrders();
    } else {
    // doc.data() will be undefined in this case
        console.log("No such document!");
    }
}

function refreshTotalOrders(){
	let total = 0;
	$('.orderState').each(function( index ) {
		let parsed = parseInt($(this).text());
		if (!isNaN(parsed)) { 
		    total += parsed;
        }
	});

	$('#totalOrders').text(total);
}