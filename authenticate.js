require('dotenv').config();
const axios = require('axios');

class OnshapeAuth {
  constructor() {
    console.log("Authentication initiated");
    this.currentToken = null;
    this.refreshToken = null;
    this.tokenTime = null;

    this.expires_in = 0;
    this.expire_buffer = 5;
    this.refreshEvery = 10000;//1000*60*50;
  }
  _processAuthRequest(req, res) {
    console.log(req.body);
    if (!req.body || !req.body.token || !req.body.refreshToken || !req.body.key) return res.send("<t>Invalid content</t>");

    if (req.body.key != process.env.SPICE_KEY) return res.send("<t>Error</t>");

    this.setToken(req.body.token);
    this.refreshToken = req.body.refreshToken;
    res.status(200).send({ message: "success" });
  }
  processAuthRequest() {
    return this._processAuthRequest.bind(this);
  }
  setToken(token) {
    this.currentToken = token;
    const self = this;
    // console.log((this.expires_in && (this.expires_in - this.expire_buffer) * 60000) || this.refreshEvery)
    this.refreshTimeout = setTimeout(() => {
      self.fetchRefreshToken().then(function (err) {
        //max tries
        if (err) this.refreshToken();
      });
    }, (this.expires_in && (this.expires_in - this.expire_buffer) * 60000) || this.refreshEvery);
  }
  getToken() {
    return this.currentToken;
  }
  isAuthenticated() {
    return this._authenticate.bind(this);
  }
  _authenticate(req, res, next) {
    console.log("authenticating");
    if (!this/* || !this.token*/) return res.status(400).send({ message: "Request cannot currently be processed." });
    req.token = this.currentToken;
    next();
  }
  async fetchRefreshToken() {
    //create request
    const self = this;
    axios.post('https://oauth.onshape.com/oauth/token?grant_type=refresh_token&refresh_token=' + encodeURIComponent(this.refreshToken) + '&client_id=' + encodeURIComponent(process.env.CLIENT_ID) + '&client_secret=' + encodeURIComponent(process.env.CLIENT_SECRET), {}, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    }).then(function (response) {
        console.log(response.data);
        self.expires_in = response.data.expires_in/60;
        // self.expires_in /= 100
        console.log(self.expires_in)
        self.setToken(response.data.access_token);
      }).catch(function (error) {
        console.log(error);
      });
  }
}


module.exports = OnshapeAuth;