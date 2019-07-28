let express = require('express');
let cors = require("cors");
const bodyParser = require('body-parser');
let app = express();
let Users = require('./routes/Users.js');

//PORT
const port = process.env.PORT || 8000;

app.use(bodyParser.json());
app.use(cors());
app.use(bodyParser.urlencoded({extended:false}));
app.use('/users',Users);
app.listen(port, () => console.log(`Listening at port ${port}`));

