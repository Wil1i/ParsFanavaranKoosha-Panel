require("dotenv").config()

const send = (code, phone, args) => {

const https = require('https');
  
  const data = JSON.stringify({
      'bodyId': code,
      'to': phone,
      'args': args
  });
  
  const options = {
      hostname: 'console.melipayamak.com',
      port: 443,
      path: process.env.smsAPI,
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
      }
  };
  
  const req = https.request(options, res => {
      console.log('statusCode: ' + res.statusCode);
  
      res.on('data', d => {
          process.stdout.write(d)
      });
  });
  
  req.on('error', error => {
      console.error(error);
  });
  
  req.write(data);
  req.end();

}

module.exports = {
    send
}