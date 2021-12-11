require("dotenv").config();
const express = require("express");
const axios = require("axios");
const path = require('path')
const bodyParser = require("body-parser");
let ejs = require('ejs');
const { auth, requiresAuth } = require('express-openid-connect');


const { getFoodInfo } = require("./api/food.js");
const { getRecipeOptions } = require("./api/recipe.js");
// const { testd } = require("./testdata");
// const { testd1 } = require("./testdata1");

const app = express();
app.set('view engine', 'ejs');
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

app.use(express.static(path.join(__dirname, 'public')));
let inventory = [ {
    name: 'Paneer',
    quantity: '1',
    unit: 'kg',
    category: 'food',
    image_url: 'https://www.edamam.com/food-img/8ee/8ee7b75071fc907cce2819031a9ae563.jpg'
}];


app.use((req, res, next) => {
    res.locals.isAuthenticated = req.oidc.isAuthenticated();
    res.locals.activeRoute = req.originalUrl;
    next();
});


app.get("/", async (req, res) => {
    // res.send(req.oidc.isAuthenticated() ? 'Logged in' : 'Logged out');

    res.sendFile(__dirname + "/public/homepage/index.html"); 
    
});
app.get('/sign-up', (req, res) => {
    res.oidc.login({
      authorizationParams: {
        screen_hint: 'signup',
      },
    });
});

app.post('/callback' , (req, res) => {
    console.log(req.body);
    res.send('callback');
});


app.get("/inventory",requiresAuth(), (req, res) => {

    res.render("inventory" ,{inventory : inventory});

});
app.get('/profile', requiresAuth(), (req, res) => {
    res.send(JSON.stringify(req.oidc.user));
});


app.post("/additems",requiresAuth(), async (req, res) => {
    const userInput  = req.body;
    const foodInfo = await getFoodInfo(userInput.name, process.env.FOODAPP_ID, process.env.FOODAPP_KEY);
    datareq = foodInfo.data.parsed[0].food;
    inventory.push({name: datareq.label, quantity: userInput.quantity, unit: userInput.unit, category: datareq.categoryLabel, image_url: datareq.image });
    return res.redirect("/inventory");

});


app.post("/deleteitem",requiresAuth(), async (req, res) => {
    inventory.splice(req.body.id, 1);
    res.redirect("/inventory");
});

app.post("/getrecipe",requiresAuth(), async (req, res) => {
    const userInput  = req.body.value;

    const recipeOptions = await getRecipeOptions(userInput, process.env.RECEPIAPP_ID, process.env.RECEPIAPP_KEY);
    // recipeOptions = testd();
    res.render("recipe", { recipeOptions: recipeOptions.data.hits.slice(0,10) });

});
