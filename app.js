const express = require('express');
const app = express();
const port = 3000;
const authenticate = new (require("./authenticate"))();
const ip = require("ip")
const fetch = new (require('./fetch'))();
const cors = require('cors')
var compression = require('compression')

const shouldCompress = (req, res) => {
  if (req.route && req.route.path == '/onshape-sharefile') {
    console.log("Here compressing")
    return compression.filter(req, res);
  }
  return false
}

app.use(express.json());
app.use(compression({
  filter: shouldCompress,
  level: 7,
}))
app.use(cors({
  origin: "*"
}));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.post('/onshape-authentication', authenticate.processAuthRequest());

app.get('/onshape',authenticate.isAuthenticated(), fetch.index());

app.get('/onshape-thumbnail',authenticate.isAuthenticated(),fetch.thumnailRequested())

app.get('/onshape-sharefile',authenticate.isAuthenticated(),fetch.fileRequested())
// var log = console.log;
// console.log = function() {
//   log.apply(console, arguments);
//   // Print the stack trace
//   console.trace();
// };

app.listen(port, ip.address(), () => {
  console.log(`Example app listening on address ${ip.address()} and port ${port}`);
});