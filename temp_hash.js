const bcrypt = require('bcryptjs');
const pw = 'vaio*0320';
bcrypt.hash(pw, 10).then(hash => {
    console.log(hash);
});
