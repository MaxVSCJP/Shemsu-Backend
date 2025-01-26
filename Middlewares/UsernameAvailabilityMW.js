const User = require("../Models/UserModel");

const usernameAvailability = async (req, res, next) => {
    const username = req.body.username;

    try {
        const user = await User.findOne({username});
        if(user) {
            return res.status(409).json({available: false});
        }
        next();
    } catch (error) {
        res.status(500).json({error: error.message});
    }
}


module.exports = usernameAvailability;