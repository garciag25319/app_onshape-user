const axios = require('axios');
const nodetreebase = require('./node-tree.json');
const fs = require('fs');

class Fetch {
  constructor() {

  }
  _index(req, res) {
    let query = req.query;
    console.log(req.token);
    console.log(query);
    if (!req.token) res.status(500).json({ message: "Site cannot currently be reached" });
    if (!query || Object.keys(query).length == 0 || !query.url) query = { url: nodetreebase.team[0], type: "team" };
    let url = query.url;
    let type = query.type;
    this.get(req.token, url, type).then((value) => {
      // console.log(value)
      this.thin(value.data,req.token).then((value)=>res.json(value));
    }).catch((err) => {
      console.log(err);
      res.status(404).send({ error: err });
    });
    // res.status(200).send('<t>statusooga booga"</t>');
  }
  index() {
    return this._index.bind(this);
  }
  async get(token, url, type) {
    let baseURL = "https://cad.onshape.com/api/globaltreenodes/";
    // baseURL = "https://httpbin.org/post/"
    // url = "post"
    if (!(type == "folder" || type == "document" || type == "team")) return false;
    baseURL += type;
    const queries = "?getPathToRoot=true&limit=50&sortColumn=modifiedAt&sortOrder=desc";
    return await axios({ baseURL, url: url + queries, headers: { Authorization: "Bearer " + token } });
  }
  async getThumbnail(href,token) {
    const res = await axios({ url: href, headers: { Authorization: "Bearer " + token } });
    // console.log(res);
    return res.data
  }
  async thin(nodetree,token) {
    const result = {};
    result.items = [];
    result.href = nodetree.href;
    if (nodetree.pathToRoot) {
      result.pathToRoot = [];
      nodetree.pathToRoot.forEach((elem) => {
        if (elem.resourceType == "magic" || elem.resourceType == "team") return;
        result.pathToRoot.push({ name: elem.name, id: elem.id, resourceType: elem.resourceType });
      });
      result.pathToRoot.push(nodetreebase.start);
    }
    let obj
    let elem
    for (let i in nodetree.items){
      // if(elem.jsonType == "document-summary")return;
      elem = nodetree.items[i]
      obj = { jsonType: elem.jsonType, name: elem.name, description: elem.description || "", id: elem.id }
      // if(elem.thumbnail)obj.thumbnail = elem.thumbnail.sizes[0].href
      result.items.push(obj);
    };
    return result;
  }
}

module.exports = Fetch;