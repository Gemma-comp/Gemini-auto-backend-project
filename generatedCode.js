import mongoose from 'mongoose';
mongoose.connect('mongodb+srv://thebighouse:thebighouse@thebighouse.ipiyiro.mongodb.net/thebighouse').then(() => mongoose.connection.db.collection('channels').find().toArray()).then(result => {
  console.log(result);
  mongoose.disconnect();
}).catch(err => console.log('Error:', err));