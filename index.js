require("dotenv").config();
const express = require("express");
const axios = require("axios");
const path = require("path");
const bodyParser = require("body-parser");
let ejs = require("ejs");
const { auth, requiresAuth } = require("express-openid-connect");
const Sequelize = require("sequelize-cockroachdb");
const pg = require("pg");

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

const Items = sequelize.define(
    "items",
    {
        sno: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        email: {
            type: Sequelize.STRING,
        },
        name: {
            type: Sequelize.TEXT,
        },
        quantity: {
            type: Sequelize.DECIMAL,
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
    },
    {
        timestamps: false,
        freezeTableName: true,
        initialAutoIncrement: 100,
    }
);

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
var postErr = "";

app.use(auth(config));

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
    res.locals.isAuthenticated = req.oidc.isAuthenticated();
    res.locals.activeRoute = req.originalUrl;
    next();
});

app.get("/", async (req, res) => {
    const authcheck = req.oidc.isAuthenticated();
    if (!authcheck) {
        res.sendFile(__dirname + "/public/home.html");
    } else {
        res.redirect("/inventory");
    }
});

app.get("/sign-up", (req, res) => {
    res.oidc.login({
        authorizationParams: {
            screen_hint: "signup",
        },
    });
});


app.get("/inventory", requiresAuth(), async (req, res) => {
    const userInfo = req.oidc.user;
    const checkuserexist = await People.findByPk(userInfo.email);
    if (!checkuserexist) {
        People.sync({ force: false }).then(function () {
            // Insert new data into People table
            return People.bulkCreate([
                {
                    email: userInfo.email,
                    name: userInfo.name,
                    nickname: userInfo.nickname,
                },
            ]);
        });
    }

    const returndata = await Items.findAll({
        where: {
            email: userInfo.email,
        },
    });
    res.render("inventory", {
        inventory: returndata,
        error: postErr,
    });
});

app.get("/profile", requiresAuth(), async (req, res) => {
    res.send(JSON.stringify(req.oidc.user));
});

app.post("/additems", requiresAuth(), async (req, res) => {
    const userInput = req.body;
    try {
        const foodInfo = await getFoodInfo(
            userInput.name,
            process.env.FOODAPP_ID,
            process.env.FOODAPP_KEY
        );
        const datareq = foodInfo.data.parsed[0].food;
        console.log(datareq);
    } catch (e) {
        postErr = "Error Occured, Please try a different item";
        return res.redirect("/inventory");
    }

    try {
        Items.bulkCreate([
            {
                email: req.oidc.user.email,
                name: datareq.label,
                quantity: userInput.quantity,
                unit: userInput.unit,
                category: datareq.categoryLabel,
                image_url: datareq.image,
            },
        ]);
        postErr = "";
    } catch (e) {
        postErr = "Error Occured, please try again";
    }

    return res.redirect("/inventory");
});

app.post("/deleteitem", requiresAuth(), async (req, res) => {
    const id_delete = req.body.id;
    await Items.destroy({
        where: {
            sno: id_delete,
        },
    });
    res.redirect("/inventory");
});
let recipedata;
app.post("/getrecipe", requiresAuth(), async (req, res) => {
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
