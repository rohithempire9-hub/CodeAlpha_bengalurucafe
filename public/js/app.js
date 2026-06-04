let cart = JSON.parse(localStorage.getItem('cart')) || [];

fetch('/api/menu')
.then(r => r.json())
.then(data => {

document.getElementById('menu').innerHTML = data.map(x => `
<div class="card">
    <h3>${x.name}</h3>
    <p>₹${x.price}</p>

    <button onclick="addToCart(${x.id}, '${x.name}', ${x.price})">
        Add To Cart
    </button>
</div>
`).join('');

});

function addToCart(id, name, price) {

let existingItem = cart.find(item => item.id === id);

if(existingItem){
    existingItem.quantity += 1;
}else{
    cart.push({
        id,
        name,
        price,
        quantity: 1
    });
}

localStorage.setItem('cart', JSON.stringify(cart));

alert(`${name} added to cart`);
}
