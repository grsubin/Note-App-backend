
const router = require('express').Router();


router.use('/auth', require('./auth'));
router.use('/users', require('./users'));
router.use('/notes', require('./notes'));

router.use(function(err, req, res, next){
    if(err.name === 'ValidationError'){
      return res.status(422).json({
        errors: Object.keys(err.errors).reduce(function(errors, key){
          errors[key] = err.errors[key].message;
  
          return errors;
        }, {})
      });
    }
  
    return next(err);
  });




module.exports = router;