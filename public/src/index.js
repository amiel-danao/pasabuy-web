import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { initializeApp } from 'firebase/app';
import { getFirestore, getDoc } from "firebase/firestore";
import moment from 'moment';

const firebaseConfig = {
  apiKey: "AIzaSyCVCz_LymxPJGaVX_Uww9RalLQo55C_tSg",
  authDomain: "pasabuy-8d8bf.firebaseapp.com",
  projectId: "pasabuy-8d8bf",
  storageBucket: "pasabuy-8d8bf.appspot.com",
  messagingSenderId: "631663355432",
  appId: "1:631663355432:web:434c86758f2fc9f40ab71d",
  measurementId: "G-XDERCMHFJN"
};

const app = initializeApp(firebaseConfig);
const database = getFirestore();
const dateformat = 'MM/DD/YYYY hh:mm:ss';
const PESO = value => currency(value, { symbol: '₱', precision: 1, decimal: '.', separator: ',' });
const auth = getAuth();
var loadingDialog;

var opts = {
  lines: 14, // The number of lines to draw
  length: 33, // The length of each line
  width: 19, // The line thickness
  radius: 71, // The radius of the inner circle
  scale: 1, // Scales overall size of the spinner
  corners: 1, // Corner roundness (0..1)
  speed: 1.2, // Rounds per second
  rotate: 0, // The rotation offset
  animation: 'spinner-line-shrink', // The CSS animation name for the lines
  direction: 1, // 1: clockwise, -1: counterclockwise
  color: '#ffffff', // CSS color or array of colors
  fadeColor: 'transparent', // CSS color or array of colors
  top: '50%', // Top position relative to parent
  left: '50%', // Left position relative to parent
  shadow: '0 0 1px transparent', // Box-shadow for the lines
  zIndex: 2000000000, // The z-index (defaults to 2e9)
  className: 'spinner', // The CSS class to assign to the spinner
  position: 'absolute', // Element positioning
};



function toggleLoading(loadingText, show){
    if(show){
      loadingDialog = bootbox.dialog({
        title: 'Loading',
        message: `<p><i class="fa fa-spin fa-spinner"></i>${loadingText}</p>`,
        backdrop: true,
        centerVertical: true,
        onEscape: false,
        closeButton: false
      });
    }
    else{
      loadingDialog.modal('hide');
    }
}

function firebaseTimeStampToDateString(timestamp){
  let date = timestamp.toDate();
  let m = moment(date);
  return m.format(dateformat);
}

function logout(){
	signOut(auth);
}

function checkCredential(){
	onAuthStateChanged(auth, (user) => {
		if (user) {
		// User is signed in, see docs for a list of available properties
		// https://firebase.google.com/docs/reference/js/firebase.User
			
			if(window.location.pathname == "/login.html"){
				window.location.replace("index.html");
			}
		// ...
		} else {
		// User is signed out
		// ...
			if(window.location.pathname != "/login.html"){
				window.location.replace("login.html");
			}
		}
	});
}


export { app, database, toggleLoading, dateformat, PESO, firebaseTimeStampToDateString, getDoc, logout, checkCredential };
