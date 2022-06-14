import {database} from './index.js';
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { query, collection, where, getDocs } from 'firebase/firestore';

const auth = getAuth();

$(function(){
    console.log("login.js start");

    const form = document.getElementById('loginform');
    form.addEventListener('submit', login);    
});


function login(event){
    event.preventDefault();
    let email = $("#emailInput").val();
    let password = $("#passwordInput").val();
    $(".preloader").fadeIn();

    signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
        // Signed in 
        const user = userCredential.user;

        checkIfAdmin(user);
        // ...
    })
    .catch((error) => {
        $(".preloader").fadeOut();
        const errorCode = error.code;
        const errorMessage = error.message;
        bootbox.alert(errorMessage);
        
    });
}


async function checkIfAdmin(user){
    const q = query(collection(database, "admin"), where("email", "==", user.email));

    const querySnapshot = await getDocs(q);
    
    if(querySnapshot.docChanges.length == 0){
        $(".preloader").fadeOut();
        bootbox.alert("Invalid user");
    }

    querySnapshot.forEach((doc) => {
        console.log(`${doc.id} == ${user.uid}`);
        if(doc.id == user.uid){
            window.location.replace("index.html");
            console.log("logged in successfully");
        }
        else{
            $(".preloader").fadeOut();
            bootbox.alert("Invalid user");
        }

        console.log(doc.id, " => ", doc.data());
    });
}