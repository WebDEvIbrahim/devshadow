$( document ).ready(function() {
 //============mix it up on portfolio section===========/////
   var mixer = mixitup('.container-pro');
});

//up and down arrow
mybutton = document.getElementById("up");
window.onscroll = function(){scrollFunction()};
function scrollFunction(){
    if(document.body.scrollTop >20 || document.documentElement.scrollTop > 20)
        {
            mybutton.style.display = "block";
        }else{
            mybutton.style.display = "none";
        }
}
function topFunction(){
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
}
// *****************************side nav**************************
var menubtn = document.getElementById("menu-btn");
var sidenav = document.getElementById("side-nav")
sidenav.style.right = "-25rem";
menubtn.onclick = function(){
    if(sidenav.style.right == "-25rem"){
        sidenav.style.right = "0";
    }
    else{
        sidenav.style.right = "-25rem"
    }
}