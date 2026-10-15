const express = require("express");
const os = require("os");
const fetch = require("node-fetch");
const cors = require("cors");
const path = require("path");
const app = express();
const PORT = 1001;

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.set('trust proxy', 1);

app.get("/", (req, res) => {
    res.send("Shadow is Work");
});
/*------------------------------------------------*/

const routes = ["book"];

routes.forEach(route => {
    app.use(`/api/${route}`, require(`./routes/${route}`));
});

/*------------------------------------------------*/
app.listen(PORT, "0.0.0.0", () => {
    console.log("Server started!");
    console.log("Port:", PORT);
    console.log("Server IP: http://68.168.30.100:" + PORT);
});
