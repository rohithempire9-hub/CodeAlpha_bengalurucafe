require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();

app.use(express.json());
app.use(express.static('public'));

// ================= MONGODB =================

const envMongoUri = process.env.MONGODB_URI;
const localMongoUri = 'mongodb://127.0.0.1:27017/bengalurucafe';
const mongoUri = envMongoUri || localMongoUri;

async function connectToMongo(uri) {
    return mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        family: 4,
        tls: uri.startsWith('mongodb+srv://')
    });
}

async function initMongo() {
    try {
        await connectToMongo(mongoUri);
        console.log(`✅ MongoDB Connected Successfully (${mongoUri.startsWith('mongodb+srv://') ? 'Atlas' : 'local'})`);
    } catch (err) {
        console.error('❌ MongoDB Connection Failed:', err);

        if (mongoUri !== localMongoUri) {
            console.warn(`⚠️ Falling back to local MongoDB at ${localMongoUri}`);
            try {
                await connectToMongo(localMongoUri);
                console.log('✅ Local MongoDB Connected Successfully');
            } catch (localErr) {
                console.error('❌ Local MongoDB Connection Failed:', localErr);
                process.exit(1);
            }
        } else {
            process.exit(1);
        }
    }
}

initMongo();
// ================= SCHEMAS =================

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String
});

const User = mongoose.model('User', userSchema);

const orderSchema = new mongoose.Schema({
    userId: String,
    userEmail: String,
    customerName: String,
    phone: String,
    address: String,
    landmark: String,
    payment: String,
    items: Array,
    total: Number,
    specialInstructions: String,
    status: {
        type: String,
        default: 'Received'
    },
    currentLocation: {
        type: String,
        default: ''
    },
    locationStatus: {
        type: String,
        default: 'Pending'
    },
    locationUpdatedAt: {
        type: Date,
        default: null
    },
    date: {
        type: Date,
        default: Date.now
    }
});

const Order = mongoose.model('Order', orderSchema);

// ================= MENU =================

const menuSchema = new mongoose.Schema({
    name: String,
    price: Number,
    category: String,
    image: String
});

const MenuItem = mongoose.model('MenuItem', menuSchema);

// Seed the menu with the original starter items the first time the app
// connects to an empty database. Safe to run every startup — it only
// inserts if the collection is empty.
async function seedMenuIfEmpty() {
    try {
        const count = await MenuItem.countDocuments();
        if (count === 0) {
            await MenuItem.insertMany([
                { name: 'Sambar Idli', price: 50, category: 'idli', image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500' },
                { name: 'Gunta Ponganalu', price: 80, category: 'special', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500' },
                { name: 'Benne Plain Dosa', price: 80, category: 'dosa', image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500' },
                { name: 'Benne Karam Dosa', price: 95, category: 'dosa', image: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=500&auto=format&fit=crop' },
                { name: 'Ghee Karam Podi Idli', price: 70, category: 'idli', image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500' },
                { name: 'Button Idli', price: 60, category: 'idli', image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500' },
                { name: 'Bisi Bele Bath', price: 120, category: 'special', image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500' },
                { name: 'Carrot Halwa', price: 90, category: 'sweet', image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa6c3d?w=500' }
            ]);
            console.log('🌱 Menu seeded with starter items');
        }
    } catch (err) {
        console.error('❌ Menu seeding failed:', err);
    }
}

mongoose.connection.once('open', seedMenuIfEmpty);

// Default placeholder image used when an admin adds an item without one
const DEFAULT_MENU_IMAGE = 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500';

function formatMenuItem(item) {
    return {
        id: item._id,
        name: item.name,
        price: item.price,
        category: item.category,
        image: item.image || DEFAULT_MENU_IMAGE
    };
}

// GET all menu items
app.get('/api/menu', async (req, res) => {
    try {
        const items = await MenuItem.find();
        res.json(items.map(formatMenuItem));
    } catch (error) {
        console.error('❌ Get Menu Failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// ADD a new menu item (admin)
app.post('/api/menu', async (req, res) => {
    try {
        const { name, price, category, image } = req.body;

        if (!name || !price || !category) {
            return res.status(400).json({
                success: false,
                message: 'Name, price, and category are required'
            });
        }

        const item = new MenuItem({
            name,
            price,
            category: category.toLowerCase(),
            image: image || DEFAULT_MENU_IMAGE
        });

        await item.save();

        res.json({ success: true, item: formatMenuItem(item) });
    } catch (error) {
        console.error('❌ Add Menu Item Failed:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// EDIT an existing menu item (admin)
app.put('/api/menu/:id', async (req, res) => {
    try {
        const { name, price, category, image } = req.body;

        const update = {};
        if (name !== undefined) update.name = name;
        if (price !== undefined) update.price = price;
        if (category !== undefined) update.category = category.toLowerCase();
        if (image !== undefined) update.image = image;

        const item = await MenuItem.findByIdAndUpdate(req.params.id, update, { new: true });

        if (!item) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }

        res.json({ success: true, item: formatMenuItem(item) });
    } catch (error) {
        console.error('❌ Edit Menu Item Failed:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE a menu item (admin)
app.delete('/api/menu/:id', async (req, res) => {
    try {
        await MenuItem.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Delete Menu Item Failed:', error);
        res.status(500).json({ success: false, message: error.message });
    }
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
        const {
            userId,
            userEmail,
            customerName,
            phone,
            address,
            landmark,
            payment,
            items,
            total,
            specialInstructions
        } = req.body;

        if (!customerName || !phone || !address || !payment || !items || !items.length) {
            return res.status(400).json({
                success: false,
                message: 'Please complete your contact, delivery, payment, and cart details.'
            });
        }

        const order = new Order({
            userId,
            userEmail,
            customerName,
            phone,
            address,
            landmark: landmark || '',
            payment,
            items,
            total,
            specialInstructions: specialInstructions || '',
            status: 'Received',
            currentLocation: '',
            locationStatus: 'Pending',
            locationUpdatedAt: null
        });

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
        const filter = {};
        if (req.query.userId) {
            filter.userId = req.query.userId;
        }

        const orders = await Order.find(filter).sort({ date: -1 });
        
        const formattedOrders = orders.map(order => ({
            id: order._id,
            userId: order.userId,
            userEmail: order.userEmail,
            customerName: order.customerName,
            phone: order.phone,
            address: order.address,
            landmark: order.landmark,
            payment: order.payment,
            items: order.items,
            total: order.total,
            specialInstructions: order.specialInstructions,
            status: order.status,
            currentLocation: order.currentLocation,
            locationStatus: order.locationStatus,
            locationUpdatedAt: order.locationUpdatedAt,
            date: order.date
        }));

        res.json(formattedOrders);
    } catch (error) {
        console.error('❌ Get Orders Failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// ================= UPDATE ORDER STATUS =================

app.put('/api/orders/:id', async (req, res) => {
    try {
        const { status, currentLocation, locationStatus } = req.body;
        const allowed = ['Received', 'Preparing', 'On the way', 'Delivered', 'Cancelled'];
        const update = {};

        if (status !== undefined) {
            if (!allowed.includes(status)) {
                return res.status(400).json({ success: false, message: 'Invalid order status' });
            }
            update.status = status;
        }

        if (currentLocation !== undefined) {
            update.currentLocation = currentLocation;
        }

        if (locationStatus !== undefined) {
            update.locationStatus = locationStatus;
            update.locationUpdatedAt = new Date();
        }

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ success: false, message: 'No order updates were provided' });
        }

        const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.json({ success: true, order });
    } catch (error) {
        console.error('❌ Update Order Status Failed:', error);
        res.status(500).json({ success: false, error: error.message });
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

const port = parseInt(process.env.PORT, 10) || 3000;

function startServer(currentPort) {
    const server = app.listen(currentPort, () => {
        console.log(`🚀 Server running on http://localhost:${currentPort}`);
    });

    server.on('error', err => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`⚠️ Port ${currentPort} is in use. Trying ${currentPort + 1}...`);
            startServer(currentPort + 1);
        } else {
            console.error('❌ Server failed to start:', err);
            process.exit(1);
        }
    });
}

startServer(port);