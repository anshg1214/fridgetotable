require("dotenv").config();
const express = require("express");
const axios = require("axios");
const path = require("path");
const bodyParser = require("body-parser");
let ejs = require("ejs");
const { auth, requiresAuth } = require("express-openid-connect");
const Sequelize = require("sequelize-cockroachdb");
import pg from 'pg';

const { getFoodInfo } = require("./api/food.js");
const { getRecipeOptions } = require("./api/recipe.js");
// const { testd } = require("./testdata");
// const { testd1 } = require("./testdata1");

var sequelize = new Sequelize({
    dialect: "postgres",
    username: process.env.SQL_USERNAME,
    password: process.env.SQL_PASSWORD,
    host: process.env.SQL_HOST,
    port: process.env.SQL_PORT,
    database: process.env.SQL_DATABASE,
    dialectOptions: {
      ssl: {
        rejectUnauthorized: false,
      },
    },
    dialectModule: pg,
    logging: false, 
});

const People = sequelize.define("people", {
    email: {
        type: Sequelize.STRING,
        primaryKey: true,
    },
    name: {
        type: Sequelize.TEXT,
    },
    nickname: {
        type: Sequelize.STRING,
    },

});

const Items = sequelize.define("items", {
    email: {
        type: Sequelize.STRING,
        primaryKey: true,
    },
    name: {
        type: Sequelize.TEXT,
    },
    quantity: {
        type: Sequelize.INTEGER,
    },
    unit: {
        type: Sequelize.STRING,
    },
    category: {
        type: Sequelize.STRING,
    },
    image_url: {
        type: Sequelize.STRING,
    },


}, {
    timestamps: false,
    freezeTableName: true,
});

let numeberref = 0;


const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.urlencoded({ extended: true }));

app.listen(process.env.PORT || 3000, () => {
    console.log("Server started on port 3000");
});

const config = {
    authRequired: false,
    auth0Logout: true,
    secret: process.env.SECRET,
    baseURL: process.env.BASE_URL,
    clientID: process.env.CLIENT_ID,
    issuerBaseURL: process.env.ISSUER_BASE_URL,
}; 

app.use(auth(config));

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));


app.use((req, res, next) => {
    res.locals.isAuthenticated = req.oidc.isAuthenticated();
    res.locals.activeRoute = req.originalUrl;
    next();
});

app.get("/", async (req, res) => {
    const authcheck = req.oidc.isAuthenticated()
    if (!authcheck) {
        // res.send(req.oidc.isAuthenticated() ? 'Logged in' : 'Logged out');
        res.sendFile(__dirname + "/public/home.html");
    }
    else{
        res.redirect('/inventory');
    }
});

app.get("/sign-up", (req, res) => {
    res.oidc.login({
        authorizationParams: {
            screen_hint: "signup",
        },
    });
});

let inventory = [
    {
        email: "",
        name: "Paneer",
        quantity: "1",
        unit: "kg",
        category: "food",
        image_url: "https://www.edamam.com/food-img/8ee/8ee7b75071fc907cce2819031a9ae563.jpg",
        idnumber: numeberref,
    },
];

app.get("/inventory",requiresAuth(), async (req, res) => {
    const checkuserexist = await People.findByPk(req.oidc.user.email);
    if(!checkuserexist){
        People.sync({ force: false, })
            .then(function () {
            // Insert new data into People table
            return People.bulkCreate([
                {
                    email: req.oidc.user.email,
                    name: req.oidc.user.name,
                    nickname: req.oidc.user.nickname,

                },
            ]);
        })
    };

    const returndata = await Items.findAll({
        where: {
          email: req.oidc.user.email
        }
    });
    res.render("inventory", { inventory: inventory.filter(item => item.email === req.oidc.user.email)});
});

app.get("/profile", requiresAuth(), async (req, res) => {
    res.send(JSON.stringify(req.oidc.user));
});

app.post("/additems",requiresAuth(), async (req, res) => {
    const userInput = req.body;
    const foodInfo = await getFoodInfo(
        userInput.name,
        process.env.FOODAPP_ID,
        process.env.FOODAPP_KEY
    );
    datareq = foodInfo.data.parsed[0].food;
    numeberref = numeberref + 1;
    Items.bulkCreate([
        {
            email: req.oidc.user.email,
            name: datareq.label,
            quantity: userInput.quantity,
            unit: userInput.unit,
            category: datareq.categoryLabel,
            image_url: datareq.image,
        }
    ]);
    inventory.push({
        email: req.oidc.user.email,
        name: datareq.label,
        quantity: userInput.quantity,
        unit: userInput.unit,
        category: datareq.categoryLabel,
        image_url: datareq.image,
        idnumber: numeberref,
    });

    return res.redirect("/inventory");
});

app.post("/deleteitem",requiresAuth(), async (req, res) => {
    inventory.splice(req.body.id, 1);
    res.redirect("/inventory");
});
let recipedata;
app.post("/getrecipe",requiresAuth(), async (req, res) => {
    const userInput = req.body.value;

    const recipeOptions = await getRecipeOptions(
        userInput,
        process.env.RECEPIAPP_ID,
        process.env.RECEPIAPP_KEY
    );

    recipedata = recipeOptions.data.hits.slice(0, 9);
    res.render("recipe", {
        recipeOptions: recipedata,
    });
});
