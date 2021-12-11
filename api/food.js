const axios = require("axios");

const getFoodInfo = async (val, id, key) => {
    const config = {
        method: "get",
        url: `https://api.edamam.com/api/food-database/v2/parser?app_id=${id}&app_key=${key}&ingr=${val}&nutrition-type=cooking`,
    };
    return await axios(config);
};

module.exports = { getFoodInfo };