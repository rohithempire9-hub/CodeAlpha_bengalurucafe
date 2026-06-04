const mongoose = require('mongoose');

mongoose.connect(
'mongodb+srv://rohithempire9_db_user:LGTBC8ca0NpyBNzL@bengalurucafe.zfyprxw.mongodb.net/bengalurucafe?retryWrites=true&w=majority&appName=bengalurucafe'
)
.then(() => {
    console.log('✅ MongoDB Connected');
})
.catch(err => {
    console.error('❌ MongoDB Error:');
    console.error(err);
});