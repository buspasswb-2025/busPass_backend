import jwt from "jsonwebtoken";

const isLoggedIn = (req, res, next) => {
  const token = req.headers?.authorization;

  if (!token) {
    return res.status(400).json({
        success: false,
        message: "Unauthorized user! no token"
    })
  }

  try {
    const verifiedUser = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if(!verifiedUser){
        return res.status(400).json({
            success: false,
            message: "Invalid token, please login again!"
        })
    }
    req.user = {
        id: verifiedUser.id,
        email: verifiedUser.email
    };
    next();
  } catch (err) {
    return res.status(403).json({
        success: false,
        message: "Unathenticated user!"
    });
  }
};

export default isLoggedIn;

