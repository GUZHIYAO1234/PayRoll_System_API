const express = require('express');
const cors = require("cors");
const users = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User.js');
const Tx = require('../models/Tx.js')
/*minimum transaction amount
    Notice that this value should be calculated by the business operator to determine
    what is the margin where the cost of initiating transaction exceeds the money earned
    from the transaction itself
*/
const MIN_TX_AMT = 10;

users.use(cors());

process.env.SECRET_KEY = 'secret';

//POST

//register
users.post('/api/register', (req, res) => {
    const today = new Date();
    const userData = {
        companyId: req.body.companyId,
        eNRIC: req.body.eNRIC,
        eId: req.body.eId,
        eName: req.body.eName,
        eEmail: req.body.email,
        rAccount: req.body.rAccount,
        mNumber: req.body.mNumber,
        pScheme: req.body.pScheme,
        mSalary: req.body.mSalary,
        wBalance: req.body.wBalance,
        ePassword: req.body.ePassword,
        eDateCreated:today
    }
});

//Login
users.post('/login', (req, res) => {

    console.log(`Email:${req.body.eEmail} Password:${req.body.ePassword}`);
    User.findOne({
        where: {
            eEmail: req.body.eEmail
        }
    })
        .then(user => {
            if (req.body.ePassword == user.ePassword) {
                let token = jwt.sign(user.dataValues, process.env.SECRET_KEY, {
                    expiresIn: 1440
                });
                res.status(200).json({ token: token });
            }
            else {
                res.status(201).send('Incorrect Password');
            }
        }).catch(err => {
            res.status(202).send('User does not exist');
            console.log(`login error:${err}`);
        });
});

//Add new transaction
users.post('/addTx', (req, res) => {
    const today = new Date();
    const txData = {
        recordType: req.body.recordType,
        productType: req.body.productType,
        oAccount: req.body.oAccount,
        oCurrency: req.body.oCurrency,
        pCurrency: req.body.pCurrency,
        pDateTime: today,
        receiver: req.body.receiver,
        rAccount: req.body.rAccount,
        swiftCode: req.body.swiftCode,
        amount: req.body.amount,
        txCode: req.body.txCode,
        pPurpose: req.body.pPurpose,
        deliveryMode: req.body.deliveryMode,
        eEmail: req.body.eEmail,
        invoiceDetail: req.body.invoiceDetail,
        txStatus: req.body.txStatus
    };


    console.log(`\n
            Record Type:${req.body.recordType} 
            Product Type:${req.body.productType} 
            Original Account:${req.body.oAccount}
            Original Currency:${req.body.oCurrency}
            Date Time:${today}
            Receiver:${req.body.receiver}
            Receiver Account:${req.body.rAccount}
            Amount:${req.body.amount}`);

    // The amount requested should not be lower than the min_amt
    if (Number(req.body.amount) < MIN_TX_AMT) {
        //console.log('die`````````');
        res.status(400).send(`Oops, the minimum value you can take is ${MIN_TX_AMT}`);
    } else {
        console.log(`1.looking for existing receiver account: ${req.body.rAccount}...`);
        Tx.findOne({
            where: { rAccount: req.body.rAccount }
        })
            .then(tx => {
                if (tx) {
                    // find user account
                    console.log("3.looking for the existing user's wallet balance...");
                    // find one existing account
                    User.findOne({
                        where: {
                            rAccount: req.body.rAccount
                        }
                    })
                        .then(user => {
                            // find user balance
                            console.log(`Find User, balance: ${user.wBalance}`);
                            // the current wallet Balance should be more than the requested amount
                            if (Number(req.body.amount) <= Number(user.wBalance)) {
                                // the requested amount should not be less than the assinged minimum amount 
                                // -- create new transaction
                                if (Tx.create(txData)) {
                                    // -- update the new balance related to the user's account
                                    if (user.update({ wBalance: user.wBalance - req.body.amount })) {
                                        res.status(200).send("Transaction and wallet balance updated!");
                                    } else {
                                        res.status(400).send("Oops, Transaction updated, but not balance");
                                    }
                                } else {
                                    res.status(400).send("Oops, Transaction not updated");
                                }
                            }
                            else {
                                res.status(400).send("Oops, Not Enough Balance");
                            }
                        }).catch(err => console.log(`login error 3:${err}`));
                } else {
                    //did not find user account
                    res.status(400).send('Oops, User does not exist');
                }
                // Pending transaction if it is sent twice
                // Nested calling
            }).catch(err => console.log(`login error 1:${err}`));
    }

});


//GET
users.get('/tx', (req, resp) =>
    Tx.findAll()
        .then(tx => {
            console.log(tx)
            resp.status(200).send(tx);
        })
        .catch(err => console.log(err))
);

users.get('/all', (req, resp) =>
    User.findAll()
        .then(user => {
            console.log(user)
            resp.status(200).send(user);
        })
        .catch(err => console.log(err))
);

module.exports = users