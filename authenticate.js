require('dotenv').config();
const axios = require('axios');

class OnshapeAuth {
  constructor() {
    console.log("Authentication initiated")
    this.currentToken = null;
    this.refreshToken = null;
    this.tokenTime = null;

    this.refreshEvery = 10000//1000*60*50;
  }
  _processAuthRequest(req, res) {
    console.log(req.body)
    if (!req.body || !req.body.token || !req.body.refreshToken || !req.body.key) return res.send("<t>Invalid content</t>");
    
    if (req.body.key != process.env.SPICE_KEY) return res.send("<t>Error</t>");

    this.token = req.body.token;
    this.refreshToken = req.body.token;
    res.status(200).send({message:"success"})
  }
  processAuthRequest(){
    return this._processAuthRequest.bind(this)
  }
  setToken(token) {
    this.currentToken = token;

    this.refreshTimeout = setTimeout(()=>{
      this.refreshToken().then(function(err){
        //max tries
        if(err)this.refreshToken();
      });
    },this.refreshEvery)
  }
  getToken(){
    return this.currentToken
  }
  isAuthenticated() {
    return this._authenticate.bind(this);
  }
  _authenticate(req,res,next){
    console.log("authenticating");
    if (!this/* || !this.token*/) return res.json({message:"Request cannot currently be processed."});
    req.token = this.token;
    next()
  }
  async refreshToken() {
    //create request
    axios.post('https://oauth.onshape.com/oauth/token?grant_type=refresh_token&refresh_token=' + this.getToken() + '&client_id=' + process.env.CLIENT_ID + '&client_secret=' + process.env.CLIENT_SECRET, {},{
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    })
    .then(function (response) {
      console.log(response);
      setToken(response.data.access_token);
    })
    .catch(function (error) {
      console.log(error);
    });
  }
}


module.exports = OnshapeAuth;