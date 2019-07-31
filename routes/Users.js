const express = require('express');
const cors = require("cors");
const users = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User.js');
const Tx = require('../models/Tx.js');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

/*minimum transaction amount
    Notice that this value should be calculated by the business operator to determine
    what is the margin where the cost of initiating transaction exceeds the money earned
    from the transaction itself
*/
const MIN_TX_AMT = 10;

/** Transaction Default Values: 
 * 
 * 
 * SwiftCode could be retrived from another database in the future
 * Invoice detail should be added by the payment script or admin manually
*/
const txDefaultOriginCurrency = "SGD";
const txDefaultReceiverCurrency = "SGD";
const txDefaultStatus = 0;
const txDefaultOriginAccount = "19388737";
const txDefaultRecordType = "Payment";
const txDefaultProductType = "GPP";
const txDefaultDeliveryMode = "E";
const txDefaultReceiver = "x";
const txDefaultCode = "20";
const txDefaultSwiftCode = "DBSSSGSG";
const txDefaultInvoiceDetail = "None";

users.use(cors());

process.env.SECRET_KEY = 'secret';

//POST

//register
users.post('/api/register', (req, res) => {
    const today = new Date();
    console.log(`NRIC: ${typeof(req.body.eNRIC)}`);
    const userData = {
        companyId: req.body.companyId,
        eNRIC: req.body.eNRIC,
        eId: req.body.eId,
        eName: req.body.eName,
        eEmail: req.body.eEmail,
        rAccount: req.body.rAccount,
        mNumber: req.body.mNumber,
        pScheme: req.body.pScheme,
        mSalary: req.body.mSalary,
        wBalance: "0",
        ePassword: req.body.ePassword,
        eDateCreated: today
    }

    User.findOne({
        where: {
            [Op.or]: [{eNRIC:req.body.eNRIC},{rAccount:req.body.rAccount}]
        }
    })
        .then(user => {
            if (!user){
                User.create(userData)
                .then(user=>{
                    let token = jwt.sign(user.dataValues, process.env.SECRET_KEY, {
                        expiresIn: 1440
                    });
                    res.json({token:token});
                })
                .catch(err=>console.log(err))
            }else{
                res.status(400).json({msg:"user or account exists"});
            }
    }).catch(err=>{
        console.log(err);
        res.status(400);
    });
});

//Login
users.post('/api/login', (req, res) => {

    console.log(`Email:${req.body.eEmail} Password:${req.body.ePassword}`);
    User.findOne({
        where: {
            eEmail: req.body.eEmail
        }
    })
        .then(user => {
            if (user) {
                if (req.body.ePassword == user.ePassword) {
                    let token = jwt.sign(user.dataValues, process.env.SECRET_KEY, {
                        expiresIn: 1440
                    });
                    res.json({user, token: token });
                }
                else {
                    res.status(400).json({msg:"Incorrect Password"});
                }
            }else{
                res.status(400).json({msg:"User does not exist"});
            }
        }).catch(err => console.log(`login error:${err}`));
});

//Add new transaction
users.post('/api/addTx', (req, res) => {
    const today = new Date();

    const txData = {
        recordType: txDefaultRecordType,
        productType: txDefaultProductType,
        oAccount: txDefaultOriginAccount,
        oCurrency: txDefaultOriginCurrency,
        pCurrency: txDefaultReceiverCurrency,
        pDateTime: today,
        receiver: txDefaultReceiver,
        rAccount: req.body.rAccount,
        swiftCode: txDefaultSwiftCode,
        amount: req.body.amount,
        txCode: txDefaultCode,
        pPurpose: req.body.pPurpose,
        deliveryMode: txDefaultDeliveryMode,
        eEmail: req.body.eEmail,
        invoiceDetail: txDefaultInvoiceDetail,
        txStatus: txDefaultStatus
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
                                // find the receiver info according to its account number
                                txData.receiver = user.eName;
                                txData.eEmail = user.eEmail;
                                // -- create new transaction
                                if (Tx.create(txData)) {
                                    // -- update the new balance related to the user's account
                                    if (user.update({ wBalance: user.wBalance - req.body.amount })) {
                                        res.status(200).json({msg:"Transaction and wallet balance updated!"});
                                    } else {
                                        res.status(400).json({msg:"Oops, Transaction updated, but not balance"});
                                    }
                                } else {
                                    res.status(400).json({msg:"Oops, Transaction not updated"});
                                }
                            }
                            else {
                                res.status(400).json({msg:"Oops, Not Enough Balance"});
                            }
                        }).catch(err => console.log(`login error 3:${err}`));
                } else {
                    //did not find user account
                    res.status(400).json({msg:"Oops, User does not exist"});
                }
                // Pending transaction if it is sent twice
                // Nested calling
            }).catch(err => console.log(`login error 1:${err}`));
    }

});


//GET
users.get('/api/tx', (req, resp) =>
    Tx.findAll()
        .then(tx => {
            console.log(tx)
            resp.status(200).send(tx);
        })
        .catch(err => console.log(err))
);

users.get('/api/all', (req, resp) =>
    User.findAll()
        .then(user => {
            console.log(user)
            resp.status(200).send(user);
        })
        .catch(err => console.log(err))
);

module.exports = users