require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();

app.use(express.json());
app.use(express.static('public'));

// ================= MONGODB =================

const mongoUri = process.env.MONGODB_URI;

console.log('DEBUG URI:', mongoUri);

if (!mongoUri) {
    console.error('❌ MONGODB_URI is not set. Add it to your .env file or hosting platform environment variables.');
    process.exit(1);
}

mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
    family: 4,
    tls: true
})
.then(() => {
    console.log('✅ MongoDB Connected Successfully');
})
.catch(err => {
    console.error('❌ MongoDB Connection Failed');
    console.error(err);
});
// ================= SCHEMAS =================

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String
});

const User = mongoose.model('User', userSchema);

const orderSchema = new mongoose.Schema({
    customerName: String,
    phone: String,
    address: String,
    payment: String,
    items: Array,
    total: Number,
    date: {
        type: Date,
        default: Date.now
    }
});

const Order = mongoose.model('Order', orderSchema);

// ================= MENU =================

const menu = [
    { id: 1, name: 'Sambar Idli', price: 50, category: 'Idli' },
    { id: 2, name: 'Gunta Ponganalu', price: 80, category: 'Special' },
    { id: 3, name: 'Benne Plain Dosa', price: 80, category: 'Dosa' },
    { id: 4, name: 'Benne Karam Dosa', price: 95, category: 'Dosa' },
    { id: 5, name: 'Ghee Onion Pesarattu', price: 100, category: 'Pesarattu' }
];

app.get('/api/menu', (req, res) => {
    res.json(menu);
});

// ================= REGISTER =================

app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name,
            email,
            password: hashedPassword
        });

        await user.save();

        res.json({
            success: true,
            message: 'Registration successful'
        });
    } catch (error) {
        console.error('❌ Registration Error:', error);
        res.status(500).json({ success: false, message: 'Server registration error', error: error.message });
    }
});

// ================= LOGIN =================

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('❌ Login Error:', error);
        res.status(500).json({ success: false, message: 'Server login error' });
    }
});

// ================= PLACE ORDER =================

app.post('/api/order', async (req, res) => {
    try {
        console.log("📥 Received Order Data:", req.body);

        const order = new Order(req.body);
        await order.save();

        res.json({
            success: true,
            message: 'Order placed successfully'
        });
    } catch (error) {
        console.error('❌ Database Order Placement Failed:', error);
        res.status(500).json({
            success: false,
            message: 'Database storage error. Could not place order.',
            error: error.message
        });
    }
});

// ================= GET ORDERS =================

app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ date: -1 });
        
        const formattedOrders = orders.map(order => ({
            id: order._id,
            customerName: order.customerName,
            phone: order.phone,
            address: order.address,
            payment: order.payment,
            items: order.items,
            total: order.total,
            date: order.date
        }));

        res.json(formattedOrders);
    } catch (error) {
        console.error('❌ Get Orders Failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// ================= DELETE ORDER =================

app.delete('/api/orders/:id', async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.id);
        res.json({
            success: true
        });
    } catch (error) {
        console.error('❌ Delete Order Failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ================= GET USERS =================

app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find();
        res.json(
            users.map(user => ({
                id: user._id,
                name: user.name,
                email: user.email
            }))
        );
    } catch (error) {
        console.error('❌ Get Users Failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// ================= SERVER =================

app.listen(3000, () => {
    console.log('🚀 Server running on http://localhost:3000');
});