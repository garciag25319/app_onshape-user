const axios = require('axios');
const nodetreebase = require('./node-tree.json');
const fs = require('fs');

const thumbnailConfig = { document: 'string', workspace: 'string', size: 'string', t: 'string' };

class Fetch {
  constructor() {

  }
  _index(req, res) {
    let query = req.query;
    console.log(req.token);
    console.log(query);
    if (!req.token) return res.status(500).json({ message: "Site cannot currently be reached" });
    if (!query || Object.keys(query).length == 0 || !query.url) query = { url: nodetreebase.team[0], type: "team" };
    let url = query.url;
    let type = query.type;
    this.get(req.token, url, type).then((value) => {
      // console.log(value)
      this.thin(value.data, req.token).then((value) => res.json(value));
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
  validateRequestBody(check, template) {
    let type;
    for (let i in template) {
      type = template[i];
      if (check[i] === undefined || (check[i] && typeof(check[i]) != type)) return false;
    }
    return true;
  }
  thumnailRequested() {
    return this._thumnailRequested.bind(this);
  }
  _thumnailRequested(req, res) {
    const body = req.query;
    // console.log(body)
    console.log(this.validateRequestBody(body, thumbnailConfig))
    if (!this.validateRequestBody(body, thumbnailConfig)) return res.status(400).send({ message: "Invalid request" });
    this.getThumbnail(body.document, body.workspace, body.size, body.t, req.token).then((response) => {
      res.set("Content-Type", "image/png");
      console.log(response)
      res.send(response.data);
    }).catch(() => {

    });
  }
  async getThumbnail(dID, wID, size, t, token) {
    let url = 'https://cad.onshape.com/api/thumbnails/d/' + dID + '/w/' + wID + '/s/' + size + "?t=" + t;
    const res = await axios({ url, headers: { Authorization: "Bearer " + token, } });
    // console.log(res);
    return res;
  }
  async thin(nodetree, token) {
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
    let obj;
    let elem;
    let href;
    const doc_re = /\/d\/(\w+)/;
    const wor_re = /\/w\/(\w+)/;
    const siz_re = /\/s\/(\w+)/;
    const t_re =/t\=(\w+)/;
    // console.log(nodetree)
    for (let i in nodetree.items) {
      // if(elem.jsonType == "document-summary")return;
      elem = nodetree.items[i];
      obj = { jsonType: elem.jsonType, name: elem.name, description: elem.description || "", id: elem.id };
      
      if (elem.thumbnail && elem.thumbnail.sizes && elem.thumbnail.sizes[0]) {
        const str = elem.thumbnail.sizes[0].href;
        href = "/onshape-thumbnail?document=";
        href += (doc_re.exec(str)[1]);
        href += "&workspace=";
        href += wor_re.exec(str)[1];
        href += "&size=";
        href += siz_re.exec(str)[1];
        href += "&t=";
        href += t_re.exec(str)[1];
        obj.thumbnail = href; 
      }
      result.items.push(obj);
    };
    return result;
  }
}

module.exports = Fetch;