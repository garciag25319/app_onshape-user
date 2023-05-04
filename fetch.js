const axios = require('axios');
const nodetreebase = require('./node-tree.json');
const fetch = require('node-fetch');


const thumbnailConfig = { document: 'string', workspace: 'string', size: 'string', t: 'string' };
const exportConfig = {units:["meter", "centimeter", "millimeter", "inch", "foot", "yard"],grouping:['true','false']}
const fileConfig = { document: 'string' };

class Fetch {
  constructor() {

    this.processingFileRequest = false;
  }
  _index(req, res) {
    let query = req.query;
    console.log(req.token);
    console.log(query);
    if (!req.token) return res.status(500).json({ message: "Site cannot currently be reached" });
    if (!query || Object.keys(query).length == 0 || !query.url) query = { url: nodetreebase.team[0], type: "team" };
    let url = query.url;
    let type = query.type;
    let getqueries;
    if(query.page)getqueries = "?getPathToRoot=true&offset=" + query.page*50 + "&limit=50&sortColumn=modifiedAt&sortOrder=desc"
    this.get(req.token, url, type,getqueries).then((value) => {
      // console.log(value)
      if(url == nodetreebase.team[0])value.data.items = value.data.items.filter((elem)=>elem.jsonType != "document-summary")
      this.thin(value.data).then((value) => res.json(value));
    }).catch((err) => {
      res.status(404).send({ error:"Server lost connection" });
    });
    // res.status(200).send('<t>statusooga booga"</t>');
  }
  index() {
    return this._index.bind(this);
  }
  async get(token, url, type,getqueries) {
    let baseURL = "https://cad.onshape.com/api/globaltreenodes/";
    // baseURL = "https://httpbin.org/post/"
    // url = "post"
    if (!(type == "folder" || type == "document" || type == "team")) return false;
    baseURL += type;
    const queries = getqueries || "?getPathToRoot=true&limit=50&sortColumn=modifiedAt&sortOrder=desc";
    return await axios({ baseURL, url: url + queries, headers: { Authorization: "Bearer " + token } });
  }
  validateRequestBody(check, template) {
    let type;
    for (let i in template) {
      type = template[i];
      if (check[i] === undefined || (check[i] && typeof (check[i]) != type)) return false;
    }
    return true;
  }
  fileRequested() {
    return this._fileRequested.bind(this);
  }
  _fileRequested(req, res) {
    const query = req.query;
    console.log(query);
    if (!this.validateRequestBody(query, fileConfig)) return res.status(400).send({ message: "Invalid request" });
    this.fileAccessAllowed(query.document, req.token).then((good) => {
      if (!good) return res.status(401).send({ message: "Haha, you thought.ඞ" });
      // this.shareFile(query.document, query.email, req.token).then((response) => {
      //   res.status(200).send({ message: "Document successfully shared with " + query.email });
      // });
      this.downloadFile(query.document, req.token,query.queries).then((response) => {
        if (!response) return res.status(400).json("Invalid part");
        response.headers.forEach((v, n) => (['content-disposition', 'content-type'].indexOf(n) != -1 && res.setHeader(n, v)));
        res.setHeader("Access-Control-Expose-Headers","file-extension")
        res.setHeader("file-extension",query.queries.grouping == "true"? "stl":"zip")
        response.body.pipe(res);
      }).catch((err)=>{
        console.log(err)
        console.log("Error happened")
        return res.status(400).send({ message: "Invalid request" });
      });
    });
  }
  async downloadFile(dID, token,queryRequests) {
    let docInfo = await axios({ url: "https://cad.onshape.com/api/documents/" + dID, headers: { Authorization: "Bearer " + token } });
    docInfo = docInfo.data;
    docInfo;
    const wID = docInfo.defaultWorkspace.id;
    // const eID = docInfo.defaultElementId
    // if(eID == null){
    //   console.log(docInfo)
    //   return new Promise((res,rej)=>{
    //     res(false)
    //   })
    // }
    let url = "https://cad.onshape.com/api/parts/d/" + dID + "/w/" + wID + "?withThumbnails=false&includePropertyDefaults=false";//"?elementId=" + eID +"&withThumbnails=false&includePropertyDefaults=false"

    console.log(url);
    const partInfo = (await axios({ url, headers: { Authorization: "Bearer " + token } })).data;
    if (partInfo == null) {
      return new Promise((res, rej) => {
        res(false);
      });
    }
    let queries = []
    if(queryRequests != null){
      for(let key in queryRequests){
        if(!exportConfig[key])continue
        exportConfig[key].constructor === Array? exportConfig[key].indexOf(queryRequests[key]) != -1 && queries.push(key + "=" + queryRequests[key]) : typeof(queryRequests[key]) == exportConfig[key] && queries.push(key + "=" + queryRequests[key])
      }
    }
    queries = queries.join("&")
    console.log(queries)
    if (partInfo.length == 1) {
      const partID = partInfo[0].partId;
      const eID = partInfo[0].elementId;
      url = "https://cad.onshape.com/api/parts/d/" + dID + "/w/" + wID + "/e/" + eID + "/partid/" + partID + "/stl?mode=text&" + queries;
      console.log(url);
      return fetch(url, { headers: { Authorization: "Bearer " + token } });
    } else if (partInfo.length > 1) {
      let partIds = '';
      partInfo.forEach(info =>{partIds += info.partId + "%2C"});
      partIds = partIds.slice(0, -3);
      const eID = partInfo[0].elementId;
      url = "https://cad.onshape.com/api/partstudios/d/" + dID + "/w/" + wID + "/e/" + eID + "/stl?partIds=" + partIds + "&mode=text&" + queries;
      console.log(url);
      return fetch(url, { headers: { Authorization: "Bearer " + token } });
    }

  }
  // _fileRequested(req, res) {
  //   const query = req.query;
  //   console.log(query);
  //   if (!this.validateRequestBody(query, fileConfig)) return res.status(400).send({ message: "Invalid request" });
  //   this.fileAccessAllowed(query.document, req.token).then((good) => {
  //     console.log(good);
  //     if (!good) return res.status(401).send({ message: "Haha, you thought.ඞ" });
  //     // this.shareFile(query.document, query.email, req.token).then((response) => {
  //     //   res.status(200).send({ message: "Document successfully shared with " + query.email });
  //     // });
  //     this.downloadFile(query.document, req.token).then((response) => {
  //       if (response == false) return res.status(400).json("Invalid part");
  //       if (!response.headers) {
  //         const filename = "assembly";
  //         res.setHeader('content-disposition', `attachment; filename="${filename}".zip`);
  //         res.setHeader('content-type', 'application/zip');
  //         res.send(response);
  //       } else {
  //         // res.setHeader('content-disposition',response.headers['content-disposition'])
  //         // res.setHeader('content-type',response.headers['content-type'])
  //         response.headers.forEach((v, n) => (['content-disposition', 'content-type'].indexOf(n) != -1 && res.setHeader(n, v)));
  //         console.log(res.getHeaders());

  //         // console.log(response.body)
  //         response.body.pipe(res);
  //       }
  //     });
  //   });
  // }
  // async downloadFile(dID, token) {
  //   let docInfo = await axios({ url: "https://cad.onshape.com/api/documents/" + dID, headers: { Authorization: "Bearer " + token } });
  //   docInfo = docInfo.data;
  //   docInfo;
  //   const wID = docInfo.defaultWorkspace.id;
  //   // const eID = docInfo.defaultElementId
  //   console.log(wID);
  //   // if(eID == null){
  //   //   console.log(docInfo)
  //   //   return new Promise((res,rej)=>{
  //   //     res(false)
  //   //   })
  //   // }
  //   let url = "https://cad.onshape.com/api/parts/d/" + dID + "/w/" + wID + "?withThumbnails=false&includePropertyDefaults=false";//"?elementId=" + eID +"&withThumbnails=false&includePropertyDefaults=false"

  //   console.log(url);
  //   const partInfo = (await axios({ url, headers: { Authorization: "Bearer " + token } })).data;
  //   if (partInfo == null) {
  //     return new Promise((res, rej) => {
  //       res(false);
  //     });
  //   }
  //   if (partInfo.length == 1) {
  //     const partID = partInfo[0].partId;
  //     const eID = partInfo[0].elementId;
  //     console.log(eID, partID);
  //     url = "https://cad.onshape.com/api/parts/d/" + dID + "/w/" + wID + "/e/" + eID + "/partid/" + partID + "/stl?mode=text&grouping=true&scale=1&units=inch";
  //     console.log(url);
  //     return fetch(url, { headers: { Authorization: "Bearer " + token } });
  //   } else if (partInfo.length > 1) {
  //     console.log("Creating zip file");
  //     console.log(partInfo.length)
  //     return new Promise((res, rej) => {
  //       let completed = 0;
  //       partInfo.forEach((info) => {
  //         const partID = info.partId;
  //         const eID = info.elementId;
  //         console.log(eID, partID);
  //         url = "https://cad.onshape.com/api/parts/d/" + dID + "/w/" + wID + "/e/" + eID + "/partid/" + partID + "/stl?mode=text&grouping=true&scale=1&units=inch";
  //         console.log(url);
  //         fetch(url, { headers: { Authorization: "Bearer " + token } }).then((response) => {
  //           // console.log(response.body);
  //           // console.log(response.body.toString());
  //           this.ungzip(response.body).then((buffer) => {

  //             console.log(typeof(buffer),buffer.length)
  //             zip.file(info.name + '__.txt', buffer);
  //             console.log(completed);
  //             completed++;
  //             if (completed == partInfo.length) {
  //               res(zip.generate({ base64: false, compression: 'DEFLATE' }));
  //             }
  //           });
  //         });
  //       });
  //     });


  //   } else {

  //   }

  // }
  // async ungzip(gzip) {
  //   return new Promise((res, rej) => {
  //     console.log("Unzip requested")
  //     var bufs = [];
  //     gzip.on('data', function (d) { bufs.push(d); });
  //     gzip.on('end', function () {
  //       var buf = Buffer.concat(bufs);
  //       console.log(buf.length)
  //       res(buf)
  //       // zlib.gunzip(buf, (err, buffer) => {
  //       //   console.log(err && err.length)
  //       //   // console.log(buffer && buffer.length)
  //       //   res(buffer);
  //       // });
  //     });
  //   })
  // }
  // if(this._fileRequested)return res.status(406).send({message:"Please try again in 20 seconds"})
  // this._fileRequested = true;
  // setTimeout(()=>this._fileRequested = false,20*1000)
  // this.getUserId(req.token).then((uid)=>{

  // });
  async fileAccessAllowed(id, token) {
    const url = "https://cad.onshape.com/api/globaltreenodes/document/" + id + "/parentInfo";
    let response = await axios({ url, headers: { Authorization: "Bearer " + token } });
    const parentId = response.data.id;
    if(response.data.jsonType == "magic")return false
    if (nodetreebase.allowed.indexOf(parentId) != -1) return true;
    response = await this.get(token, parentId, "folder");
    const path = response.data.pathToRoot;
    let valid = false;
    path.forEach((elem) => { if (nodetreebase.allowed.indexOf(elem.id) != -1) valid = true; });
    return valid;
    // }).catch((err) => {
    //   console.log(err);
    //   return false;
    // });
  }
  async shareFile(dID, email, token) {
    return await axios.post('https://cad.onshape.com/api/documents/' + dID + '/share', { documentId: dID, permissionSet: ["READ"], entries: [{ entryType: 0, email }] }, { headers: { Authorization: "Bearer " + token } });
  }
  // async getFile(dID,wID,token){
  //   let url = 'https://cad.onshape.com/api/documents/d/' + dID + '/w/' + wID + '/translate';
  //   return fetch(url, { headers: { Authorization: "Bearer " + token } });
  // }
  // async setUserSettings(uid){
  //   return axios.post('https://cad.onshape.com/api/users/' + uid + '/settings',{})
  // }
  // async getUserId(){
  //   return await fetch('https://cad.onshape.com/api/users/sessioninfo', { headers: { Authorization: "Bearer " + token } }).body.id;
  // }
  thumnailRequested() {
    return this._thumnailRequested.bind(this);
  }
  _thumnailRequested(req, res) {
    const body = req.query;
    // console.log(body)
    // console.log(this.validateRequestBody(body, thumbnailConfig));
    if (!this.validateRequestBody(body, thumbnailConfig)) return res.status(400).send({ message: "Invalid request" });
    this.getThumbnail(body.document, body.workspace, body.size, body.t, req.token).then((response) => {
      // res.set("Content-Type", "image/png");
      // console.log(response);
      // res.send(response.data);
      response.headers.forEach((v, n) => res.setHeader(n, v));
      response.body.pipe(res);
    }).catch(() => {

    });
  }
  async getThumbnail(dID, wID, size, t, token) {
    let url = 'https://cad.onshape.com/api/thumbnails/d/' + dID + '/w/' + wID + '/s/' + size + "?t=" + t;
    return fetch(url, { headers: { Authorization: "Bearer " + token } });
    // const res = await axios({ url, headers: { Authorization: "Bearer " + token, } });
    // console.log(res);
    // return res;
  }
  async thin(nodetree) {
    const result = {};
    result.items = [];
    result.href = nodetree.href;
    if (nodetree.pathToRoot) {
      result.pathToRoot = [];
      nodetree.pathToRoot.forEach((elem) => {
        if (elem.resourceType == "magic" || elem.resourceType == "team") return;
        const obj = {};
        // result.pathToRoot.push({ name: elem.name, id: elem.id, resourceType: elem.resourceType });
        for (let i in nodetreebase.return_values.folders) {
          const type = nodetreebase.return_values.folders[i];
          obj[type] = elem[type] || "";
        }
        result.pathToRoot.push(obj);
      });
      result.pathToRoot.push(nodetreebase.start);
    }
    let obj;
    let elem;
    let href;
    const doc_re = /\/d\/(\w+)/;
    const wor_re = /\/w\/(\w+)/;
    const siz_re = /\/s\/(\w+)/;
    const t_re = /t\=(\w+)/;
    // console.log(nodetree)
    for (let i in nodetree.items) {
      // if(elem.jsonType == "document-summary")return;
      elem = nodetree.items[i];
      // obj = { jsonType: elem.jsonType, name: elem.name, description: elem.description || "", id: elem.id };
      obj = {};
      for (let i in nodetreebase.return_values.items) {
        const type = nodetreebase.return_values.items[i];
        obj[type] = elem[type] || "";
      }

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