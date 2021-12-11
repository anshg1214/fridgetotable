const axios = require("axios");

const getRecipeOptions = async (val, id, key) => {
    const config = {
        method: "get",
        url: `https://api.edamam.com/api/recipes/v2?type=public&app_id=${id}&app_key=${key}&q=${val}`,
    };
    return await axios(config);
};

module.exports = { getRecipeOptions };