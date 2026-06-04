let cart = JSON.parse(localStorage.getItem('cart')) || [];

let cartHTML = '';
let total = 0;

cart.forEach(item => {

let itemTotal = item.price * item.quantity;
total += itemTotal;

cartHTML += `
<div style="border:1px solid #ddd;padding:10px;margin:10px;">
    <h3>${item.name}</h3>

    <p>
        ₹${item.price}
        ×
        ${item.quantity}
    </p>

    <strong>
        Total: ₹${itemTotal}
    </strong>
</div>
`;
});

cartHTML += `
<hr>
<h2>Total Amount: ₹${total}</h2>
`;

document.getElementById('cart').innerHTML = cartHTML;

function checkout(){

fetch('/api/order',{
method:'POST',
headers:{
'Content-Type':'application/json'
},
body:JSON.stringify({
items:cart,
total:total
})
})
.then(r=>r.json())
.then(data=>{

alert('Order placed successfully!');

localStorage.removeItem('cart');

window.location.href='/';

});
}
