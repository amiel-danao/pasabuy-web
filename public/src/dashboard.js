'use strict';
import { database, getDoc} from './index.js';
import { collection, query, where, onSnapshot, setDoc, doc, Timestamp} from "firebase/firestore";
import {Chart, registerables } from 'chart.js';

const counterIds = ['totalOrders', 'pendingOrders', 'totalShops'];
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

  const data = {
    labels: labels,
    datasets: [{
      label: 'Orders',
      backgroundColor: '#3ef57f',
      borderColor: '#3ef57f',
      data: [5, 10, 5, 2, 20, 30, 0, 0, 0, 0, 0, 0],
    }]
  };

  const config = {
    type: 'line',
    data: data,
    options: {}
  };


$(function(){
    console.log('start dashboard');
    Chart.register(...registerables);
    const myChart = new Chart(
        document.getElementById('myChart'),
        config
      );
    attachSettingsListener();
});


async function attachSettingsListener(){
    const docRef = doc(database, "settings", "counters");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        console.log("Document data:", docSnap.data());
        let data = docSnap.data();

        for(var i=0; i < counterIds.length; i++){
            let key = counterIds[i];
            if(data[key] != undefined){
                document.getElementById(key).innerText = data[key];
            }
        }
        
    } else {
    // doc.data() will be undefined in this case
        console.log("No such document!");
    }
}