require("dotenv").config()
const axios = require("axios")

const send = async (code, phone, args) => {

  await axios.post("https://console.melipayamak.com/api/send/shared/99089820f65349e9a00ca3967511ebd2", {"bodyId" : code, "to" : phone, "args" : args})

}

module.exports = {
    send
}