/* Ejemplo de como crear un servidor con expressjs */
var express = require('express');
var path = require('path');
var request = require('request');
var fs = require('fs');
var app = express();
var config = require('./config/configv0.4')();
var coder = require('web3/lib/solidity/coder');


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

app.get('/',function(req, response){
  response.render('index');
});

app.get('/obtenerPrecio',function(req, response){
  var  url= "https://api.hitbtc.com/api/2/public/trades/"+req.query.par.coin1+req.query.par.coin2;
  url+="?desc=desc&limit=1&from="+req.query.from+"&till="+req.query.till;
  //hago un llamado a la api de hitBTC
  request(url, function (error, res, body) {
    if(!error){
      datos = JSON.parse(body);console.log("respuesta Ajax",datos[0]);
       response.status(200).json({error:false,datos:datos});
    }else{
      //debo mandar error en la peticion ajax
      response.status(200).json({error:true,mensaje:"An error occurred when trying to perform the operation. Please try again"});
    }

  });
});

app.get('/cobrar',function(req, response){
	const Web3 = require('web3');
  var datosContract={};
  var contract=null;
  var CryptoJS = require('crypto-js');
  const Tx = require('ethereumjs-tx');
  netWork = 4;
  // connect to Infura node
  //if (netWork == 4) {
    var web3 = new Web3(new Web3.providers.HttpProvider('https://kovan.infura.io/RkeQNk1tmz2SlNBIFu2X'));
  //}
  var contract = new web3.eth.Contract(config.contractAbi,config.contractAddress);
    contract.methods.getValuesSecc2().call(function(err,result){
        console.log(err,result);
        if(!err){
            datosContract.userIncreasing=result[0];
            datosContract.userDecreasing=result[1];
            datosContract.userIncPayment=web3.utils.fromWei(result[2]);
            datosContract.userDecPayment=web3.utils.fromWei(result[3]);
            datosContract.coin1=result[4];
            datosContract.coin2=result[5];
            datosContract.amountPaid=web3.utils.fromWei(result[6]);
            datosContract.odds=result[7];
            datosContract.dateLimit=result[9];
            datosContract.dateRate=result[8];
            datosContract.rate_Reference=result[10]/Math.pow(10,8);;
            var  url= "https://api.hitbtc.com/api/2/public/trades/"+datosContract.coin1+datosContract.coin2;
            url+="?desc=desc&limit=1&from="+(datosContract.dateLimit-3000)+"&till="+(datosContract.dateLimit)
          //hago un llamado a la api de hitBTC
          request(url, function (error, res, body) {
            if(!error){
              datos = JSON.parse(body);console.log("respuesta Ajax",datos[0]);
              if(datos[0].price>=datosContract.rate_Reference){
                      console.log('Gano el  que apostaba por UP');
                      datosContract.ganador= datosContract.userIncreasing;
                  }else{
                      console.log('Gano el  que apostaba por DOWN');
                      datosContract.ganador= datosContract.userDecreasing;
                  }
                  var value=parseFloat((datos[0].price)).toFixed(8);
                  /*codigo para mandar la transaccion*/
                  const addressFrom = config.firmAddress;
                  const privKey = config.firmAddressPk;
                  function sendSigned(txData, cb) {
                    const privateKey = new Buffer(privKey, 'hex')
                    const transaction = new Tx(txData)
                    transaction.sign(privateKey)
                    const serializedTx = transaction.serialize().toString('hex');
                    web3.eth.sendSignedTransaction('0x' + serializedTx, cb);
                  }
                  // var testNum = token;
                  var fecha=new Date(datos[0].timestamp).getTime();
                  var data = '0x' + encodeFunctionTxData('doPayout',['string','uint256'],[value,fecha]);
                  //console.log("Data",data);
                 // get the number of transactions sent so far so we can create a fresh nonce
                  web3.eth.getTransactionCount(addressFrom).then(txCount => {

                  const txData = {
                      nonce: txCount,
                      gasLimit: 120000,
                      gasPrice:10e9, // 10 Gwei(10e+10), // 10 Gwei <--- le pongo 40?
                      to:config.contractAddress ,
                      from: addressFrom,
                      data:data,
                      chainId:42,
                      value: 0
                  }
                  // fire away!
                  sendSigned(txData, function(err, result) {
                      console.log("Result","\n");
                      console.log(result)
                      console.log(txData)
                      console.log('\n');
                      if (err) {
                        data = "Error "+new Date()+" : "+err+"\n";
                        response.status(200).json({error:true,data:data});
                      }else{
                        data = "txAdress "+new Date()+" : "+result+"\n";
                        response.status(200).json({error:false,data:data});
                      }
                    })

                  })
                  function encodeFunctionTxData(functionName, types, args) {
                    var fullName = functionName + '(' + types.join() + ')';
                    console.log("funcion a llamar",fullName,"Parametros",args);
                    var signature = CryptoJS.SHA3(fullName, { outputLength: 256 }).toString(CryptoJS.enc.Hex).slice(0, 8);
                    var dataHex = signature + coder.encodeParams(types, args);
                    return dataHex;
                  }
                  /*codigopara mandar la transaccion*/
            }else{
              //debo mandar error en la peticion ajax
              response.status(200).json({error:true,mensaje:"An error occurred when trying to perform the operation. Please try again 1"});
            }
        
          });
        }else{
          //debo retornar un error a la funcion ajax
          response.status(200).json({error:true,mensaje:"An error occurred when trying to perform the operation. Please try again 2"});
        }
  })
});
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.listen(3007, function(){
  console.log('Server Express Ready! in port 3007');
});