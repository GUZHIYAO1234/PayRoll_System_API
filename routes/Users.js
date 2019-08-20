const express = require('express');
const cors = require("cors");
const moment = require("moment");
const users = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User.js');
const Tx = require('../models/Tx.js');
const Company = require('../models/Company.js');
const Plan = require('../models/Plan');
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
 * 2% charge
 * 
 * SwiftCode could be retrived from another database in the future
 * Invoice detail should be added by the payment script or admin manually
*/
const txDefaultOriginCurrency = "SGD";
const txDefaultReceiverCurrency = "SGD";
const txDefaultStatus = 0;
const txDefaultOriginAccount = "0549064882";
const txDefaultRecordType = "PAYMENT";
const txDefaultProductType = "GPP";
const txDefaultDeliveryMode = "E";
const txDefaultReceiver = "x";
const txDefaultCode = "20";
const txDefaultSwiftCode = "DBSSSGSGXXX";
const txDefaultInvoiceDetail = "None";
const txDefaultPurpose = "OTHR";
const txDefaultChargeRate = 0.02;

users.use(cors());

process.env.SECRET_KEY = 'secret';

//Functions
//POST

//register
users.post('/api/register', (req, res) => {
    const today = new Date();
    console.log(`NRIC: ${typeof (req.body.eNRIC)}`);
    const userData = {
        companyId: req.body.companyId,
        eNRIC: req.body.eNRIC,
        eId: "1",
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
            [Op.or]: [{ eNRIC: req.body.eNRIC }, { rAccount: req.body.rAccount }]
        }
    })
        .then(user => {
            if (!user) {
                User.create(userData)
                    .then(user => {
                        let token = jwt.sign(user.dataValues, process.env.SECRET_KEY, {
                            expiresIn: 1440
                        });
                        res.json({ token: token });
                    })
                    .catch(err => console.log(err))
            } else {
                res.status(400).json({ msg: "user or account exists" });
            }
        }).catch(err => {
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

                    Company.findOne({
                        where: {
                            company_UEN: user.companyId
                        }
                    }).then(company => {
                        if (company) {
                            let token = jwt.sign(user.dataValues, process.env.SECRET_KEY, {
                                expiresIn: 1440
                            });
                            res.json(
                                {
                                    rAccount: user.rAccount,
                                    mSalary: user.mSalary,
                                    eId: user.eId,
                                    rate: txDefaultChargeRate.toString(),
                                    companyName: company.company_name,
                                    wBalance: user.wBalance,
                                    token: token
                                }
                            );
                        } else {
                            console.log({msg:"Comp does not exist, you might be hacked!"});
                            res.status(400).send({msg:"Dangerous!No such company!"});
                        }
                    });

                }
                else {
                    console.log("Incorrect Password!");
                    res.status(400).send({msg:"Incorrect Password!"});
                }
            } else {
                console.log("User does not exist");
                res.status(400).json({msg:"User does not exist!"});
            }
        }).catch(err => {
            res.status(500).send(err);
            console.log(`login error:${err}`);
        });
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
        pPurpose: txDefaultPurpose,
        deliveryMode: txDefaultDeliveryMode,
        eEmail: req.body.eEmail,
        invoiceDetail: txDefaultInvoiceDetail,
        txStatus: txDefaultStatus
    };

/*
    console.log(`\n
            Record Type:${req.body.recordType} 
            Product Type:${req.body.productType} 
            Original Account:${req.body.oAccount}
            Original Currency:${req.body.oCurrency}
            Date Time:${today}
            Receiver:${req.body.receiver}
            Receiver Account:${req.body.rAccount}
            Amount:${req.body.amount}`);
*/
    // The amount requested should not be lower than the min_amt
    if (Number(req.body.amount) < MIN_TX_AMT) {
        //console.log('die`````````');
        res.status(400).send(`Oops, the minimum value you can take is ${MIN_TX_AMT}`);
    } else {
        console.log(`1.looking for existing receiver account: ${req.body.rAccount}...`);

        // find user account
        console.log("2.looking for the existing user's wallet balance...");
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
                if (Number(req.body.amount) * (1.0 + txDefaultChargeRate) <= Number(user.wBalance)) {
                    // the requested amount should not be less than the assinged minimum amount 
                    // find the receiver info according to its account number
                    txData.receiver = user.eName;
                    txData.eEmail = user.eEmail;
                    // -- create new transaction
                    if (Tx.create(txData)) {
                        // -- update the new balance related to the user's account
                        if (user.update({ wBalance: (Number(user.wBalance) - Number(req.body.amount) * (1.0 + txDefaultChargeRate)).toString() })) {
                            console.log(`Added Charge: ${(Number(req.body.amount) * (1.0 + txDefaultChargeRate)).toString()}`);
                            res.status(200).json({ msg: "Transaction and wallet balance updated!" });
                        } else {
                            res.status(400).json({ mbalance: (Number(user.wBalance) - Number(req.body.amount) * (1.0 + txDefaultChargeRate)).toString(), msg: "Oops, Transaction updated, but not balance" });
                        }
                    } else {
                        res.status(400).json({ msg: "Oops, Transaction not updated" });
                    }
                }
                else {
                    res.status(400).json({ msg: "Oops, Not Enough Balance" });
                }
            }).catch(err => console.log(`login error 3:${err}`));

        // Pending transaction if it is sent twice
        // Nested calling

    }

});


//GET

//get all transactions
users.get('/api/tx', (req, resp) =>
    Tx.findAll()
        .then(tx => {
            console.log(tx)
            resp.status(200).send(tx);
        })
        .catch(err => console.log(err))
);

//get all existing users
users.get('/api/all', (req, resp) =>
    User.findAll()
        .then(user => {
            console.log(user)
            resp.status(200).send(user);
        })
        .catch(err => console.log(err))
);

//get user info by its account
users.get('/api', (req, resp) => {
    let date = new Date();
    let userAccount = req.query.rAccount;
    let firstDay = moment(new Date(date.getFullYear(),
        date.getMonth(), 1)).format("YYYY-MM-DD");
    let lastDay = moment(new Date(date.getFullYear(),
        date.getMonth() + 1, 0)).format("YYYY-MM-DD");
    // console.log(`User Account ${userAccount}`);

    User.findOne({
        where: {
            rAccount: userAccount
        }
    })
        .then(user => {
            if (user) {
                const userData = {
                    companyId: user.companyId,
                    eNRIC: user.eNRIC,
                    eId: user.eId,
                    eName: user.eName,
                    eEmail: user.eEmail,
                    mNumber: user.mNumber,
                    pScheme: user.pScheme,
                    mSalary: user.mSalary,
                    wBalance: user.wBalance,
                    eDateCreated: user.eDateCreated,
                    eMonthlyPlan: null
                }

                //monthly plan for that user
                Plan.findAll({
                    where: {
                        rAccount: userAccount,
                        pDate: {
                            [Op.between]: [firstDay, lastDay]
                        }
                    },
                    attributes: ['pDate', 'sAllocated', 'pStatus']
                })
                    .then(plans => {
                        if (plans.length != 0) {
                            //console.log(plans)
                            userData.eMonthlyPlan = plans;
                        } else {
                            console.log("No Records!");
                            userData.eMonthlyPlan = { msg: `Oops, no records of user ${userAccount}` }
                        }
                        resp.status(200).send(userData);
                    })
                    .catch(err => {
                        console.log(err);
                        //resp.status(500).send(err);
                    })
                ///
            } else {
                console.log("User does not exist!");
                resp.status(400).json({ msg: `Oops, User ${userAccount} does not exist` });
            }
        })
        .catch(err => console.log(err))
});

//get all cash-out transactions by account number
users.get('/api/txOutOf', (req, resp) => {
    let userAccount = req.query.rAccount;
    console.log(`User Account ${userAccount}`);
    Tx.findAll({
        where: {
            rAccount: userAccount
        }
    })
        .then(tx => {
            if (tx.length != 0) {
                console.log(tx)
                resp.status(200).send(tx);
            } else {
                console.log("User does not exist!");
                resp.status(400).json({ msg: `Oops, User ${userAccount} does not exist` });
            }
        })
        .catch(err => console.log(err))
});

//get monthly plan(incoming transactions) of current month
users.get('/api/planOf', (req, resp) => {
    let userAccount = req.query.rAccount;
    let date = new Date();
    //let month = date.getMonth(); // it returns 0 - 11 representing month Jan - Dec
    let firstDay = moment(new Date(date.getFullYear(),
        date.getMonth(), 1)).format("YYYY-MM-DD");

    let lastDay = moment(new Date(date.getFullYear(),
        date.getMonth() + 1, 0)).format("YYYY-MM-DD");

    console.log(`First Day: ${firstDay}\n Last Day: ${lastDay} type:${typeof (lastDay)}`);
    //console.log(`Month: ${month} Datatype: ${typeof (month)}`);
    //console.log(`User Account ${userAccount}`);

    Plan.findAll({
        where: {
            rAccount: userAccount,
            pDate: {
                [Op.between]: [firstDay, lastDay]
            }
        },
        attributes: ['pDate', 'sAllocated', 'pStatus']
    })
        .then(plans => {
            if (plans.length != 0) {
                //console.log(plans)
                resp.status(200).send(plans);
            } else {
                console.log("User does not exist!");
                resp.status(400).json({ msg: `Oops, User ${userAccount} does not exist` });
            }
        })
        .catch(err => {
            console.log(err);
            resp.status(500).send(err);
        })
});

//get all incoming and outgoing transactions of current month by user account
users.get('/api/txOf', (req, resp) => {

    const txData = {
        txId: null,
        txStatus: null,
        oAccount: null,
        receiver: null,
        amount: null,
        pDateTime: null,
        pPurpose: null,
    };

    let data = [];
    let userAccount = req.query.rAccount;
    let date = new Date();
    //let month = date.getMonth(); // it returns 0 - 11 representing month Jan - Dec
    let firstDay = moment(new Date(date.getFullYear(),
        date.getMonth(), 1)).format("YYYY-MM-DD");

    let lastDay = moment(new Date(date.getFullYear(),
        date.getMonth() + 1, 0)).format("YYYY-MM-DD");

    console.log(`First Day: ${firstDay}\n Last Day: ${lastDay} type:${typeof (lastDay)}`);
    //console.log(`Month: ${month} Datatype: ${typeof (month)}`);
    //console.log(`User Account ${userAccount}`);

    Plan.findAll({
        where: {
            rAccount: userAccount,
            pDate: {
                [Op.between]: [firstDay, lastDay]
            }
        }
    })
        .then(plans => {
            if (plans.length != 0) {
                //console.log(plans)
                Tx.findAll({
                    where: {
                        rAccount: userAccount,
                        pDateTime: {
                            [Op.between]: [firstDay, lastDay]
                        }
                    }
                })
                    .then(txs => {
                        // For txout status, confirmed as 1 and unconfirmed as 0
                        // change the confirmed tx_in status as 3 and unconfirmed tx_in status as 2
                        for (var p_n = 0, len = plans.length; p_n < len; p_n++) {
                            if (plans[p_n].pStatus == 1) {
                                data.push({
                                    txId: "00" + plans[p_n].planId.toString(),
                                    txStatus: 3,
                                    oAccount: null,
                                    receiver: null,
                                    amount: plans[p_n].sAllocated,
                                    pDateTime: plans[p_n].pDate,
                                    pPurpose: null
                                });
                            } else {
                                data.push({
                                    txId: "00" + plans[p_n].planId.toString(),
                                    txStatus: 2,
                                    oAccount: null,
                                    receiver: null,
                                    amount: plans[p_n].sAllocated,
                                    pDateTime: plans[p_n].pDate,
                                    pPurpose: null
                                });
                            }
                        }

                        for (var t_n = 0, len = txs.length; t_n < len; t_n++) {
                            data.push({
                                txId: txs[t_n].txId.toString(),
                                txStatus: txs[t_n].txStatus,
                                oAccount: txs[t_n].oAccount,
                                receiver: txs[t_n].receiver,
                                amount: txs[t_n].amount,
                                pDateTime: txs[t_n].pDateTime,
                                pPurpose: txs[t_n].pPurpose
                            });
                        }
                        resp.status(200).send(data);
                    });

            } else {
                console.log("User does not exist!");
                resp.status(400).json({ msg: `Oops, User ${userAccount} does not exist` });
            }
        })
        .catch(err => {
            console.log(err);
            //resp.status(500).send(err);
        })
});

module.exports = users