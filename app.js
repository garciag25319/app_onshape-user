const express = require('express');
const app = express();
const port = 3000;
const authenticate = new (require("./authenticate"))();
const ip = require("ip")
const fetch = new (require('./fetch'))();
const cors = require('cors')

app.use(express.json());
app.use(cors({
  origin: "*"
}));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.post('/onshape-authentication', authenticate.processAuthRequest());

app.get('/onshape',authenticate.isAuthenticated(), fetch.index());

// var log = console.log;
// console.log = function() {
//   log.apply(console, arguments);
//   // Print the stack trace
//   console.trace();
// };

app.listen(port, ip.address(), () => {
  console.log(`Example app listening on address ${ip.address()} and port ${port}`);
});