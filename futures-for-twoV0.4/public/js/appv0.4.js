function montoAcobrar(){
    datosContract.devolverAUp=(parseFloat(datosContract.userIncPayment) - parseFloat(datosContract.minToBetTrue));
    if(datosContract.devolverAUp<0){
        datosContract.devolverAUp=0;
    }
    datosContract.devolverADOWn=(parseFloat(datosContract.userDecPayment) - parseFloat(datosContract.minToBetFalse));
    if(datosContract.devolverADOWn<0){
        datosContract.devolverADOWn=0;
    }

    datosContract.totalcobrar = parseFloat(datosContract.amountPaid) - datosContract.devolverAUp-datosContract.devolverADOWn
}

function ObtenerValore(){
     //pido los datos iniciales
    window.contract.getValuesSecc1.call(function(err,result){
        console.log(err,result);
        if(!err){
            var num=result[1].toNumber();
            var dem=result[2].toNumber();
            var fee=(num/ dem);
            if(isNaN(fee)){
                fee=2;
            }
            window.datosContract.fee={valor:fee,dem:dem,num:num};
            window.datosContract.minPaym=web3.fromWei(result[3].toNumber());
            window.datosContract.catParticipants=result[0].toNumber();
            window.datosContract.minToBetTrue=0;
            window.datosContract.minToBetFalse=0;
            window.contract.getValuesSecc2.call(function(err,result){
                if(!err){
                    console.log(err,result);
                    window.datosContract.userIncreasing=result[0];
                    window.datosContract.userDecreasing=result[1];
                    window.datosContract.userIncPayment=web3.fromWei(result[2].toNumber());
                    window.datosContract.userDecPayment=web3.fromWei(result[3].toNumber());
                    window.datosContract.coin1=result[4];
                    window.datosContract.coin2=result[5];
                    window.datosContract.amountPaid=web3.fromWei(result[6].toNumber());
                    window.datosContract.odds=result[7];
                    window.datosContract.dateLimit=result[9].toNumber();
                    window.datosContract.dateRate=result[8].toNumber();
                    window.datosContract.rate_Reference=result[10].toNumber()/Math.pow(10,8);
                    montoAcobrar();
                    console.log('cantidad de participants',window.datosContract.catParticipants);
                    if(window.datosContract.catParticipants==0){
                        console.log('Screen 1 (first bettor)');
                        initScreen1();
                    }else{
                        if(datosContract.catParticipants==1){
                            if(window.accountUser!=window.datosContract.userIncreasing&&window.accountUser!=window.datosContract.userDecreasing){
                               console.log('Screen-2');
                               initScreen2();
                            }else{
                                console.log('Screen-3 siendo uno de los apostadores');
                                initScreen3(false);
                            }
                            initScreen2();
                        }else{
                            if(window.accountUser!=window.datosContract.userIncreasing&&window.accountUser!=window.datosContract.userDecreasing){
                               console.log('Screen-3 sin ser uno de los apostadores');
                               initScreen3(false);
                            }else{
                                console.log('Screen-3 siendo uno de los apostadores');
                                initScreen3(false);
                            }
                        }
                    }
                }else{
                    //hubio un error
                    console.log('error:',err);
                }
            });
        }else{
            //hubio un error
            console.log('error window.contract.getValues:',err);
        }
    });
}

function initContratc(){
    //inicializo el contrato
    window.contract = web3.eth.contract(_config.contractAbi).at(_config.contractAddress);

   ObtenerValore();
    /*events */
    //escucha la nueva apuesta
    window.contract.Initiated().watch(function(error,result){
        console.log('Event Initiated:',error,result);
        if(!error){
             _config.hideModalLoading();
             _config.showModal("Notice","alert alert-info","A new bet has been made");
              //debo preguntar si soy el que hizo la apuesta
             ObtenerValore();
        }else{
            console.log(error);
        }
    });


    //entro el segundo participante
    window.contract.Second().watch(function(error,result){
        console.log('Event Second:',error,result);
        if(!error){
            _config.hideModalLoading();
            initScreen3(true); 
            _config.showModal("Notice","alert alert-info","has entered the missing punter");
        }else{
            console.log(error);
        }
    });



    //una reapuesta
    window.contract.NewBet().watch(function(error,result){
        console.log('Event NewBet:',error,result);
        if(!error){
            _config.hideModalLoading();
             initScreen3(true);
        }else{
            console.log(error);
        }
    });
    //finalizo la apuesta y se proceso todo bien
    window.contract.Ended().watch(function(error,result){
        console.log('Event Ended:',error,result);
        if(!error){
            _config.hideModalLoading();
            _config.showModal('Notice',null,"CONTRACT FINALIZED. AMOUNT PAYED TO THE WINNER");
            $('#divCobrar button').remove();
        }else{
            console.log(error);
        }
    });

     //finalizo la apuesta y hubo una especie de error
    window.contract.Failed().watch(function(error,result){
        console.log('Event Failet:',error,result);
        alert("LLEgo el evento failet, revisa la data en la consola");
        if(!error){
            _config.hideModalLoading();
            $("#resultFailet").append('<h4 style="margin-left: 15px;">Bet cancelled</h4>');
            if(window.datosContract.catParticipants==1){
                $("#resultFailet").append(' <label class="col-lg-12 col-md-12 col-sm-12 text-danger bg-danger" style="font-weight: 900;padding: 10px;">Second participant never entered. Funds were refunded to first participant, minus the fee</label>');
            }else{
                /*if( window.datosContract.readyForPayout==false){
                    $("#resultFailet").append(' <label class="col-lg-12 col-md-12 col-sm-12 text-danger bg-danger" style="font-weight: 900;padding: 10px;">Bets did not match odds and were refunded</label>');
                }*/
            }
        }else{
            console.log(error);
        }
    });
}

function init(){
     _config.showLoading();
    //compruebo si existe metamask
    if (typeof web3 == 'undefined'){
        _config.hideLoading();
        _config.showModal("Error","alert alert-danger","Please install metamask to use this application");
        $("#data_network").html("<b>Network:</b> unknown");
        $('#default div').html("<div style='color:red'>Please install metamask to use this application</div>");
    }else{
        //si el usuario no esta logueaod en metamask
        if (web3.eth.accounts.length == 0) {
            _config.hideLoading();
            _config.showModal("Notice","alert alert-info","Please log in with metamask to use this application");
             $("#data_network").html("<b>Network:</b> unknown");
             $('#default div').html("<div style='color:red'>Please log in to your metamask account to use this application <a style='cursor:pointer' onclick='init()'>Try again</a></div>");
        }else{
            window.networkVersion = web3.version.network;
            //comprueba que la red sea kovan
            web3.version.getNetwork((err, netId,) => {
                switch (netId) {
                    case "1":
                         _config.hideLoading();
                        $("#data_network").html("<b>Network:</b> Mainnet");
                         _config.showModal("Error","alert alert-danger","Please change to Kovan test network");
                      break
                    case "2":
                        _config.hideLoading();
                        $("#data_network").html("<b>Network:</b> Morden");
                          _config.showModal("Error","alert alert-danger","Please change to Kovan test network");
                      break
                    case "3":
                         _config.hideLoading();
                        $("#data_network").html("<b>Network:</b>Ropsten");
                        _config.showModal("Error","alert alert-danger","Please change to Kovan test network");
                      break
                    case "4":
                        _config.hideLoading();
                        $("#data_network").html("<b>Network:</b> Rinkeby<br>");
                        _config.showModal("Error","alert alert-danger","Please change to kovan test network");
                        /*$("#data_network").html("<b>Network:</b> Rinkeby<br><b>Contract Address:</b> "+_config.contractAddress);
                        web3.eth.defaultAccount = web3.eth.accounts[0];
                        window.accountUser=web3.eth.accounts[0];
                        initContratc();*/
                      break
                    case "42":
                        $("#data_network").html("<b>Network:</b> Kovan<br><b>Contract Address:</b> "+_config.contractAddress);
                        web3.eth.defaultAccount = web3.eth.accounts[0];
                        window.accountUser=web3.eth.accounts[0];
                        initContratc();
                       /* _config.hideLoading();
                        $("#data_network").html("<b>Network:</b> Kovan<br>");
                        _config.showModal("Error","alert alert-danger","Please change to Rinkeby test network");*/
                      break
                    default:
                        _config.hideLoading();
                        $("#data_network").html("<b>Network:</b> unknown");
                        _config.showModal("Error","alert alert-danger","Please change to Rinkeby test network");
                }
            });
        }
    }
}
var bandera2=false;
function counter(id,date) {
  var theDate = new Date(date);
  var _second = 1000;
  var _minute = _second * 60;
  var _hour = _minute * 60;
  var _day = _hour * 24;
  var timer;

  function count() {
    var now = new Date();
    if (theDate > now) {
      var distance = theDate - now;
      console.log("B");
      if (distance < 0) {
        clearInterval(timer);
        return;
      }
    } else {
        console.log("C");
        clearInterval(timer);
        document.getElementById(id).innerHTML = '<span>0</span>' + ' <span>0</span>' + '<i> : </i>' + '<span >0</span>' + '<i> : </i>' + '<span>0</span>';
        if(window.datosContract.catParticipants==2){
            finalizarApuesta();
            return;
        }
         if(window.datosContract.catParticipants==1){
            console.log("No entro el segundo, debo recoger mi apuesta, y solo le mostrare el boton de recoger si el usuario que esta logueado fue el que aposto");
             return;
        }
    }
    var days = Math.floor(distance / _day);
    var hours = Math.floor((distance % _day) / _hour);
    if (hours < 10) {
      hours = '0' + hours;
    }
    var minutes = Math.floor((distance % _hour) / _minute);
    if (minutes < 10) {
      minutes = '0' + minutes;
    }
    var seconds = Math.floor((distance % _minute) / _second);
    if (seconds < 10) {
      seconds = '0' + seconds;
    }
    var daytext = '';
    if (days > 1) {
      daytext = ' days ';
    } else {
      daytext = ' day ';
    }
    if (days > 0) {
      document.getElementById(id).innerHTML = '<span>' + days + '</span>' + '<span>' + hours + '</span>' + '<i> : </i>' + '<span >' + minutes + '</span>' + '<i> : </i>' + '<span>' + seconds + '</span>';
    } else {
      document.getElementById(id).innerHTML = '<span>' + hours + '</span>' + '<i> : </i>' + '<span>' + minutes + '</span>' + '<i> : </i>' + '<span>' + seconds + '</span>';
    }
    if(datosContract.catParticipants==2){
        var distance = theDate - now;
        if(((distance/1000)/60)<=15){
            $('#reBetDiv').hide();
            if(bandera2==false){
                $("#errorFinalizarA").append(' <label class="col-lg-12 col-md-12 col-sm-12 text-danger bg-danger" style="font-weight: 900;padding: 10px;">The bets are closed. The result will be calculated at 0 oclock UTC</label>');
                $("#errorFinalizarA").show();
                bandera2=true;
            }
        }
    }
    if(hours==0&&minutes==0&&seconds==0){
        clearInterval(timer);
        if(window.datosContract.catParticipants==2){
             finalizarApuesta();
        }
         if(window.datosContract.catParticipants==1){
            console.log("No entro el segundo, debo recoger mi apuesta, y solo le mostrare el boton de recoger si el usuario que esta logueado fue el que aposto");
        }
    }
  }
  timer = setInterval(count, 1000);
}

var intentos=0;
function finalizarApuesta(){
    $("errorFinalizarA").hide();
    _config.showModalLoading('The bet to finished. Calculating results, please do not change the window or update the same'); 
    //Pregunto por los siguientes datos coin1, coin2 y limit
    //pregunto de nuevo por el precio del par al momento de realizar la transaccion
    intentos++;
    $.ajax({
        method: "GET",
        url: "obtenerPrecio",
        data:{ "from":datosContract.dateLimit-3000,"till":datosContract.dateLimit,'par':{coin1:window.datosContract.coin1,coin2:window.datosContract.coin2}},
        beforeSend: function (xhr) {
            //xhr.setRequestHeader('Access', '*/*');
            //xhr.setRequestHeader('Access-Control-Allow-Origin', 'http://localhost:3007/'),
            //xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        },
        success:function(data) {
            if(data.error==true){
                if(intentos==5){
                    $('#reBetDiv').hide();
                    $("#errorFinalizarA").html('<label class="col-lg-6 col-md-6 col-sm-12" style="font-weight: 900;">An error occurred when calculating the results.<a onclick="finalizarApuesta()">try it again</a></label>');
                    $('#errorFinalizarA').show();
                    _config.hideModalLoading();
                    _config.showModal("Error",null,"The operation could not be performed, it reached the maximum number of attempts allowed");
                    intentos=0;
                }else{
                    finalizarApuesta();
                }
                return;
            }
            datos=data.datos;
            if(datos!=null&&datos.length!=0){
                _config.hideModalLoading();
                $('#errorFinalizarA').hide();
                intentos=0;
                //calculo el ganador y el perdedor
                console.log(datos[0]);
                if(window.datosContract.catParticipants==2){
                     if(parseFloat(datos[0].price)>=window.datosContract.rate_Reference){
                        console.log('Gano el  que apostaba por UP');
                        window.datosContract.ganador= window.datosContract.userIncreasing;
                        window.datosContract.perdedor= window.datosContract.userDecreasing;
                        window.datosContract.ganadorDir= "UP";
                    }else{
                        console.log('Gano el  que apostaba por DOWN');
                        window.datosContract.ganador= window.datosContract.userDecreasing;
                        window.datosContract.perdedor= window.datosContract.userIncreasing;
                        window.datosContract.ganadorDir= "DOWN";
                    }
                    pintarOpcionGanador(datos[0].price);
                }
            }else{
                if(intentos==5){
                    $('#reBetDiv').hide();
                    $("#errorFinalizarA").html('<label class="col-lg-6 col-md-6 col-sm-12" style="font-weight: 900;">An error occurred when calculating the results.<a onclick="finalizarApuesta()">try it again</a></label>');
                    $('#errorFinalizarA').show();
                    _config.hideModalLoading();
                    _config.showModal("Error",null,"The operation could not be performed, it reached the maximum number of attempts allowed");
                    intentos=0;
                }else{
                    finalizarApuesta();
                }
            }
        },error:function (error){
            console.log('error'+intentos);
            if(intentos==5){
                $('#reBetDiv').hide();
                $("#errorFinalizarA").html('<label class="col-lg-6 col-md-6 col-sm-12" style="font-weight: 900;">An error occurred when calculating the results.<a onclick="finalizarApuesta()">try it again</a></label>');
                $('#errorFinalizarA').show();
                _config.hideModalLoading();
                _config.showModal("Error",null,"The operation could not be performed, it reached the maximum number of attempts allowed");
                intentos=0;
            }else{
                finalizarApuesta();
            }
        }
    });
}

var intentosCobro=0;
function cobrar(){
    if(bandera()){
        _config.showModalLoading("Processing please do not change the window or update the same");
       $('#divCobrar button').attr("disabled",true)
        //se envia la transaccion de cobro
         intentosCobro++;
        $.ajax({
            type: 'GET', // added,
            url: 'cobrar',
            params: {},
            //dataType: 'jsonp' - removed
            //jsonpCallback: 'callback' - removed
            success: function (data) {
                console.log(data);
                if(data.error==false){
                    intentosCobro=0;
                    console.log("Esperando a que llegue el evento endded o failet");
                }else{
                    if(intentosCobro==5){
                        _config.hideModalLoading();
                        $('#divCobrar button').attr("disabled",false);
                        $('#divCobrar button').removeClass("disabled");
                        _config.showModal("Error",null,"An error occurred when trying to perform the operation. Please try again");
                        intentosCobro=0;
                    }else{
                        cobrar();
                    }
                }
            },
            error: function (xhr, status, error) {
                if(intentosCobro==5){
                    _config.hideModalLoading();
                    $('#divCobrar button').attr("disabled",false);
                    $('#divCobrar button').removeClass("disabled");
                     _config.showModal("Error",null,"An error occurred when trying to perform the operation. Please try again");
                    intentosCobro=0;
                }else{
                    cobrar();
                }
            }
        });
    }
}

function pintarOpcionGanador(precio){
    montoAcobrar();
    var feevalor=window.datosContract.fee.valor*window.datosContract.totalcobrar;
    $('#Final_cup').text(precio+" ETH"); 
    $('#prize').text((window.datosContract.totalcobrar-feevalor)+" ETH");
    var  url= "https://api.hitbtc.com/api/2/public/trades/"+window.datosContract.coin1+window.datosContract.coin2;
    url+="?desc=desc&limit=1&from="+(window.datosContract.dateLimit-3000)+"&till="+(window.datosContract.dateLimit)
    $('#linkAPIPirceFinal').text("Price to datelimited of the transaction (taken from hitBTC)");
    $('#linkAPIPirceFinal').attr('href',url);
    $('#linkAPIPirceFinal').attr('target',"_blank");
    var adicional ="";
    if(window.datosContract.devolverAUp>0){
        adicional="<br>When the bet is charged, "+datosContract.devolverAUp+" ETH will be returned to the one who bet for UP due to overdraft in his bet.";
    }
    if(window.datosContract.devolverADOWn>0){
         adicional="<br>When the bet is charged, "+datosContract.devolverADOWn+" ETH will be returned to the one who bet for DOWN due to overdraft in his bet.";
    }
    if(window.datosContract.ganador==window.accountUser){
        //debo cobrar la apuesta
        console.log('gane');
        $('#ganPer').html("Congratulations, you have won the bet."+adicional);
        $('#ganPer').removeClass('text-danger');$('#ganPer').removeClass('bg-danger');
        $('#ganPer').addClass('text-success');$('#ganPer').addClass('bg-success');
        $('#divCobrar').html(' <button onclick="cobrar()" class="btn btn-success">Collect bet</button>');
        $('#divCobrar').show();
    }else{
         if(window.datosContract.perdedor==window.accountUser){
            //mensaje que perdi
            console.log('perdi');
            $('#ganPer').html("Sorry, you've lost your bet."+adicional);
            $('#ganPer').addClass('text-danger');$('#ganPer').addClass('bg-danger');
            $('#ganPer').removeClass('text-success');$('#ganPer').removeClass('bg-success');
            $('#divCobrar').hide();
        }else{
            //usuario invitado
            console.log('usuario invitado');
            $('#ganPer').text("Winner: "+ window.datosContract.ganadorDir);
            $('#ganPer').removeClass('text-danger');$('#ganPer').removeClass('bg-danger');
            $('#ganPer').addClass('text-success');$('#ganPer').addClass('bg-success');
            $('#divCobrar').hide();
        }
    }
    $('#reBetDiv').hide();
    $('#results').show();
}

function recogerFondos(){
    console.log("function para recoger los fondos");
}

function initScreen3(X){
    if(X){
        _config.showLoading();
        window.contract.getValuesSecc1.call(function(err,result){
            if(!err){
               window.datosContract.catParticipants=result[0].toNumber();

                //Pregunto por los participantes
                window.contract.getValuesSecc2.call(function(err,result){
                    if(!err){
                        console.log(err,result);
                        window.datosContract.userIncreasing=result[0];
                        window.datosContract.userDecreasing=result[1];
                        window.datosContract.userIncPayment=web3.fromWei(result[2].toNumber());
                        window.datosContract.userDecPayment=web3.fromWei(result[3].toNumber());
                        window.datosContract.coin1=result[4];
                        window.datosContract.coin2=result[5];
                        window.datosContract.amountPaid=web3.fromWei(result[6].toNumber());
                        window.datosContract.odds=result[7];
                        window.datosContract.dateLimit=result[9].toNumber();
                        window.datosContract.dateRate=result[8].toNumber();
                        window.datosContract.rate_Reference=result[10].toNumber()/Math.pow(10,8);
                        montoAcobrar();
                        //obtengo los demas valores
                        window.contract.betsStatus.call(function(err,result){
                            if(!err){
                                window.datosContract.minToBetTrue=web3.fromWei(result[1].toNumber());
                                window.datosContract.minToBetFalse=web3.fromWei(result[2].toNumber());
                                montoAcobrar();
                                _config.hideLoading();
                                $('#default').hide();$("#Screen-1").hide();$('#Screen-3').show();$("#Screen-2").hide();
                                PaintBet();
                            }
                        });
                    }else{
                        _config.hideLoading();
                    }
                });
            }else{
                _config.hideLoading();
            }
        });
    }else{
        window.contract.betsStatus.call(function(err,result){
            if(!err){
                window.datosContract.minToBetTrue=web3.fromWei(result[1].toNumber());
                window.datosContract.minToBetFalse=web3.fromWei(result[2].toNumber());
                 montoAcobrar();
                _config.hideLoading();
                $('#default').hide();$("#Screen-1").hide();$('#Screen-3').show();$("#Screen-2").hide();
                PaintBet();
            }
        });
    }
}

function initScreen1(){
    //agrego el fee
    $("#fee").text(window.datosContract.fee.valor+" %");
    //inicializo los datos
    window.pairs.forEach(function(value,index){
        if(index==0){
            window.partSelected=value;
             $('#infoParText').html(partSelected.text);
            CargarPrecioPar();
        }
        $("#AddBet #pair").append('<option value="'+index+'">'+value.text+'</option>');
    });
    for (var i = 0; i < 24; i++) {
         $("#AddBet #timeLimit").append('<option value="'+(i+1)+'">'+(i+1)+'</option>');
    }
    $('#AddBet #odds').val(1);
    $('#AddBet #cantBet').attr('min',window.datosContract.minPaym);
    $('#AddBet #cantBet').val(window.datosContract.minPaym);
    if(window.datosContract.minPaym==0){
        $('#AddBet #cantBet').val(0,00000001);
    }
    $('#default').hide();_config.hideLoading();$("#Screen-2").hide();
    $("#Screen-3").hide();$('#Screen-1').show();
}


function bandera(){
    if(window.contract==null){
        return false;
    }
    return true;
}

function addDateNow(diasAdd){
    //var fecha = new Date(),
    //addTime = diasAdd * 86400000; //Tiempo en milisegundos
    //fecha.setMilliseconds(addTime); //Añado el tiempo
    /*ya sume la cantidad en dias, ahora saco lo de que el cierre es al final del ultimo dia*/
    //obtengo una fecha en base a la fecha que se le sumo los dias sin tomar en cuenta las horas sumandole un dia
    //var nueva=new Date((fecha.getMonth()+1)+"-"+(fecha.getDate()+1)+"-"+fecha.getFullYear());
    //la fecha final es la nueva fecha - 5 minutos
    //fechaFinal=nueva.getTime()-5*(60000); //1526097300000
    //return fechaFinal;
    var fecha = new Date(),
    addTime = diasAdd * 60000; //Tiempo en milisegundos
    fecha.setMilliseconds(addTime); //Añado el tiempo
    return parseInt((fecha.getTime())/1000);
}

function apostar(){
    if(bandera()){
        _config.showLoading();
        $('#AddBet .btn-block').attr('disabled',true);
        var coin1 =window.partSelected.coin1;var coin2 =window.partSelected.coin2;
        var dir =false; if($('#AddBet #dirBet').val()=="true"){dir =true;}
        var odds = parseFloat($('#AddBet #odds').val()).toFixed(2);
        var timestamp=addDateNow(parseInt($('#AddBet #timeLimit').val()));
        var rate=(parseFloat(window.partSelected.price)).toFixed(8);
        var rate_time=window.partSelected.timestamp
        var value=web3.toWei($("#AddBet #cantBet").val());
        console.log(coin1,coin2,dir,odds,timestamp,rate,rate_time,value);
        window.contract.enterFirst(coin1,coin2,dir,odds,timestamp,rate,rate_time,{value:value,gas:3000000,from:web3.eth.defaultAccount},function(err,result){
            console.log(err,result);
            _config.hideLoading(); $('#AddBet .btn-block').attr('disabled',false);
            $('#AddBet .btn-block').removeClass('disabled');
            if(!err){
                _config.showModalLoading('Waiting for the transaction to run, please do not change the window or update the same'); 
            }else{
                _config.showModal("Error",null,"An error occurred when trying to perform the operation. Please try again");
            }
        });
    }else{
         init();
    }
}


function apostar2(){
    if(bandera()){
        _config.showLoading();
        $('#buttonbet2').attr('disabled',true);
        var value=web3.toWei($("#cantBet2").val());
        console.log('parametros',value);
          window.contract.enterSecond({value:value,gas:3000000,from:web3.eth.defaultAccount},function(err,result){
            console.log(err,result);
            _config.hideLoading(); $('#buttonbet2').attr('disabled',false);
            $('#buttonbet2').removeClass('disabled');
            if(!err){
                _config.showModalLoading('Waiting for the transaction to run, please do not change the window or update the same');
            }else{
                _config.showModal("Error",null,"An error occurred when trying to perform the operation. Please try again");
            }
        });
    }else{
         init();
    }
}


function changePar(){
    window.partSelected=window.pairs[parseInt($('#AddBet #pair').val())];
    CargarPrecioPar();
}

function getFecha(cadena){
    var fecha = new Date(cadena);
    return moment(fecha).format('DD/MM/YYYY HH:mm:ss');
}

function CargarPrecioPar(){
    $('#loadingPrice').show();
    $('#AddBet #pair').attr('disabled',true);
    $('#AddBet .btn-block').attr('disabled',true);
    var timestamp=parseInt((new Date().getTime())/1000);
    $.ajax({
        method: "GET",
        url: "obtenerPrecio",
        data:{ "from": timestamp-3600,"till":timestamp,'par':window.partSelected},
        success:function(data) {
            console.log(data);
            var datos=data.datos;
            if(data.error==false){
                $('#loadingPrice').hide();$('#AddBet #pair').attr('disabled',false);
                $('#AddBet .btn-block').attr('disabled',false);$('#AddBet .btn-block').removeClass('disabled');
                window.partSelected.price=datos[0].price; window.partSelected.timestamp=timestamp;
                $('#infoParText').html(partSelected.text);
                $('#infoParFecha').html(getFecha(window.partSelected.timestamp*1000));
                $('#infoParPrecio').html(datos[0].price+" "+window.partSelected.coin2);
            }else{
                $('#loadingPrice').hide();$('#AddBet #pair').attr('disabled',false);
                $('#AddBet .btn-block').attr('disabled',false);$('#AddBet .btn-block').removeClass('disabled');
                var datos={price:0.00,timestamp:"No Data"};
                window.partSelected.price=datos.price; window.partSelected.timestamp=datos.timestamp;
                $('#infoParText').html(partSelected.text);
                $('#infoParFecha').html('');
                $('#infoParPrecio').html('0.00 '+window.partSelected.coin2);
            }
        },error:function (error){
            $('#loadingPrice').hide();$('#AddBet #pair').attr('disabled',false);
            $('#AddBet .btn-block').attr('disabled',false);$('#AddBet .btn-block').removeClass('disabled');
            var datos={price:0.00,timestamp:"No Data"};
            window.partSelected.price=datos.price; window.partSelected.timestamp=datos.timestamp;
            $('#infoParText').html(partSelected.text);
            $('#infoParFecha').html('');
            $('#infoParPrecio').html('0.00 '+window.partSelected.coin2);
        }
    });
}

function PaintBet(){
    //pintar la apuesta en la seccion 3
    $('#datosBet #marketBet').text(window.datosContract.coin1+"/"+window.datosContract.coin2);
    var simboloInc=" ETH";var simboloDec=" ETH";
    if(window.datosContract.userIncreasing=="0x0000000000000000000000000000000000000000"){
        simboloInc+=" (Waiting for a bettor)";
    }else{
        if(window.accountUser==window.datosContract.userIncreasing){
            simboloInc+=" (YOU)";
        }
    }
     if(window.datosContract.userDecreasing=="0x0000000000000000000000000000000000000000"){
        simboloDec+=" (Waiting for a bettor)";
    }else{
        if(window.accountUser==window.datosContract.userDecreasing){
            simboloDec+=" (YOU)";
        }
    }
    $('#datosBet #doBett').text(window.datosContract.userDecPayment+simboloDec);
    $('#datosBet #uptBett').text(window.datosContract.userIncPayment+simboloInc);
    $('#datosBet #totalBet').text(window.datosContract.amountPaid+" ETH");
    $('#datosBet #valorfee').text(window.datosContract.fee.valor+"%");
    var feevalor=window.datosContract.fee.valor*window.datosContract.totalcobrar;
    $('#datosBet #feeBet').text(Math.round(feevalor * Math.pow(10,18)) / Math.pow(10,18) +" ETH");
     var valorT=window.datosContract.totalcobrar-feevalor;
    $('#datosBet #payBet').text((Math.round(valorT * Math.pow(10,18)) / Math.pow(10,18))+" ETH");
    $('#datosBet #oddsBet').text(window.datosContract.odds);
    $('#datosBet #rateBet').text(window.datosContract.rate_Reference+" "+window.datosContract.coin2);
    $('#timeBet').text(getFecha(window.datosContract.dateLimit*1000));
    $('#datosBet #dateFirstBet').text(getFecha(window.datosContract.dateRate*1000));
    var  url= "https://api.hitbtc.com/api/2/public/trades/"+window.datosContract.coin1+window.datosContract.coin2;
    url+="?desc=desc&limit=1&from="+(window.datosContract.dateRate-3600)+"&till="+((window.datosContract.dateRate))
    $('#linkAPI').text("Price when making the transaction (taken from hitBTC)");
    $('#linkAPI').attr('href',url);
    $('#linkAPI').attr('target',"_blank");
    counter("counter",new Date(window.datosContract.dateLimit*1000));
   // counter("counter",1526065729000);

   if(window.datosContract.catParticipants==2){
        $('#reBetDiv').show();
        //verifico algunas acciones
        if (window.datosContract.userIncPayment < window.datosContract.minToBetTrue){
            console.log("el usuario que aposto por up debe la resta de minToBetTrue con userIncPayment");
            valor=window.datosContract.minToBetTrue-window.datosContract.userIncPayment;
            if(!(window.accountUser==window.datosContract.userIncreasing)){
                //si yo aposte por up, yo debo
                $('#mensaje').html('Tthe opposing bettor can bet '+valor+" ETH to match the bet. <i id='help' class='fa fa-question-circle'></i>");
                $('#help').attr("data-toggle","popover");
                $('#help').attr("title","information");
                $('#help').attr("data-content","If your counterparty does not match your bet, at timeout, no matter the result, you will be refunded for the remaining amount ("+valor+" ETH)");
                $('[data-toggle="popover"]').popover(); 
            }
            if(!(window.accountUser==window.datosContract.userDecreasing)){
                //si yo aposte por down, mi oponente debe
                $('#mensaje').html('You can bet '+valor+" ETH to match the bet. <i id='help' class='fa fa-question-circle'></i>");
                $('#help').attr("data-toggle","popover");
                $('#help').attr("title","information");
                $('#help').attr("data-content","Your opponent has bet more, you can bet to match or beat your opponent's bet");
                $('[data-toggle="popover"]').popover();
            }
            $('#mensaje').show();
            $('#help').css("cursor","pointer")
            $('#mensaje').addClass('text-success');$('#mensaje').addClass('bg-success');
        }
        if (window.datosContract.userDecPayment < window.datosContract.minToBetFalse){
            console.log("el usuario que aposto por down debe la resta de minToBetFalse con userDecPayment");
            valor=window.datosContract.minToBetFalse-window.datosContract.userDecPayment
            if(window.accountUser==window.datosContract.userIncreasing){
                //si yo aposte por up, mi oponente debe
                $('#mensaje').html('Tthe opposing bettor can bet '+valor+" ETH to match the bet. <i id='help' class='fa fa-question-circle'></i>");
                $('#help').attr("data-toggle","popover");
                $('#help').attr("title","information");
                $('#help').attr("data-content","If your counterparty does not match your bet, at timeout, no matter the result, you will be refunded for the remaining amount ("+valor+" ETH)");
                $('[data-toggle="popover"]').popover(); 
            }
            if(window.accountUser==window.datosContract.userDecreasing){
                //si yo aposte por down, yo debo
                $('#mensaje').html('You can bet '+valor+" ETH to match the bet. <i id='help' class='fa fa-question-circle'></i>");
                 $('#help').attr("data-toggle","popover");
                $('#help').attr("title","information");
                $('#help').attr("data-content","Your opponent has bet more, you can bet to match or beat your opponent's bet");
                $('[data-toggle="popover"]').popover();
            }
            $('#mensaje').show();
            $('#help').css("cursor","pointer");
            $('#mensaje').addClass('text-success');$('#mensaje').addClass('bg-success');
        }
        if(datosContract.devolverADOWn==0&&datosContract.devolverAUp==0){
            console.log("Estan equiparadas las apuestas, debo borrar alguno de los cartelitos si estan disponibles");
            $('#mensaje').hide();
        }
        if(window.accountUser==window.datosContract.userIncreasing||window.accountUser==window.datosContract.userDecreasing){
            $('#reBet #cantBetAgain').attr('min',0.000000001);
            $('#reBet #cantBetAgain').attr('step',0.000000001);
            $('#reBet #cantBetAgain').val(window.datosContract.minPaym);
            $('#rebetbutton').removeClass('disabled');
        }else{
            $('#reBetDiv').hide();
        }
    }else{
        $('#reBetDiv').hide();
    }
}

function initScreen2(){
    window.contract.betsStatus.call(function(err,result){
        if(!err){
            window.datosContract.minToBetTrue=web3.fromWei(result[1].toNumber());
            window.datosContract.minToBetFalse=web3.fromWei(result[2].toNumber());
            _config.hideLoading();
            //pintar la apuesta en la seccion 3
            $('#datosBet2 #marketBet2').text(window.datosContract.coin1+"/"+window.datosContract.coin2);
            var simbolo; var total; var min; var textButton;
            if(datosContract.userIncPayment>0){
                simbolo=datosContract.userIncPayment+" ETH (UP)";total=datosContract.userIncPayment+" ETH";
                min=datosContract.minToBetFalse;textButton="Bet for DOWN";
            }
            if(datosContract.userDecPayment >0){
                simbolo=datosContract.userDecPayment+" ETH (DOWN)"; total=datosContract.userDecPayment+" ETH";
                min=datosContract.minToBetTrue;textButton="Bet for UP";
            }
            $('#datosBet2 #directionBet2').text(simbolo);
            $('#datosBet2 #totalBet2').text(total);
            $('#datosBet2 #valorfee2').text(window.datosContract.fee.valor+"%");
            var feevalor=window.datosContract.fee.valor*window.datosContract.totalcobrar;
            $('#datosBet2 #feeBet2').text(Math.round(feevalor * Math.pow(10,18)) / Math.pow(10,18) +" ETH");
            var valorT=window.datosContract.totalcobrar-feevalor;
            $('#datosBet2 #payBet2').text((Math.round(valorT * Math.pow(10,18)) / Math.pow(10,18))+" ETH");
            $('#datosBet2 #oddsBet2').text(window.datosContract.odds);
            $('#datosBet2 #rateBet2').text(window.datosContract.rate_Reference+" "+window.datosContract.coin2);
            $('#timeBet2').text(getFecha(window.datosContract.dateLimit*1000));
            $('#datosBet2 #dateFirstBet2').text(getFecha(window.datosContract.dateRate*1000));
            var  url= "https://api.hitbtc.com/api/2/public/trades/"+window.datosContract.coin1+window.datosContract.coin2;
            url+="?desc=desc&limit=1&from="+(window.datosContract.dateRate-3000)+"&till="+((window.datosContract.dateRate))
            $('#linkAPI2').text("Price when making the transaction (taken from hitBTC)");
            $('#linkAPI2').attr('href',url);
            $('#linkAPI2').attr('target',"_blank");
            counter("counter2",window.datosContract.dateLimit*1000);
            $('#minbet2').text(min);$('#buttonbet2').text(textButton);
            $('#cantBet2').val();$('#cantBet2').attr("min",min);
            $('#default').hide();_config.hideLoading();$("#Screen-1").hide();
            $("#Screen-3").hide();$('#Screen-2').show();
            $('#buttonbet2').removeClass('disabled');
        }
    });
}


function reBet(){
    if(bandera()){
        _config.showLoading();
        $('#rebetbutton').attr('disabled',true);
        var value=web3.toWei($("#reBet #cantBetAgain").val());
        console.log('parametros',value);
        web3.eth.sendTransaction({from: web3.eth.defaultAccount,to: _config.contractAddress, value: value, gas: 3000000},function (err,result){
            console.log(err,result);
            _config.hideLoading(); $('#rebetbutton').attr('disabled',false);
            $('#rebetbutton').removeClass('disabled');
            if(!err){
                _config.showModalLoading('Waiting for the transaction to run, please do not change the window or update the same'); 
            }
        });
        /*window.contract.fallback({value:value,gas:3000000,from:web3.eth.defaultAccount},function(err,result){
            console.log(err,result);
            _config.hideLoading(); $('#rebetbutton').attr('disabled',false);
            $('#rebetbutton').removeClass('disabled');
            if(!err){
                _config.showModalLoading('Waiting for the transaction to run, please do not change the window or update the same'); 
            }
        });*/
    }else{
         init();
    }
}

$( window ).on( "load", function() {
    window.contract=null;
    window.networkVersion=null;
    window.datosContract={};
    window.accountUser=null;
    window.partSelected=null;
    window.Bet=null;
    window.pairs=[
        {text:"EOS/ETH", coin1:"EOS",coin2:"ETH"},
        {text:"ETH/USD", coin1:"ETH",coin2:"USD"}
    ];
    $("#app_name").text(_config.app_name);
    document.title = _config.app_name;
    init();
    //$('#Screen-2').show();

    $('#AddBet').validator().on('submit',function(e){
        if(e.isDefaultPrevented()){
            console.log('formulario invalido');
        }else{
            e.preventDefault();
            if(window.partSelected.price==0&&window.partSelected.timestamp=="No Data"){
                _config.showModal("Notice","alert alert-info","The current price of the HitBTC currency could not be obtained");
            }else{
                apostar();
            }

        }
    });
    $('#reBet').validator().on('submit',function(e){
        if(e.isDefaultPrevented()){
            console.log('formulario invalido');
        }else{
            e.preventDefault();
            console.log('valido');
            reBet();
        }
    });
    $('#reBet2').validator().on('submit',function(e){
        if(e.isDefaultPrevented()){
            console.log('formulario invalido');
        }else{
            e.preventDefault();
            apostar2();
        }
    });

    /*
    if (typeof web3 !== 'undefined') { 
        console.log('Using Metamask')
        window.web3 = new Web3(web3.currentProvider);
        window.Metamask = true;
    } else {
        console.log('Using Geth')
        window.Metamask = false;
        window.web3 = new Web3(new Web3.providers.HttpProvider("https://"+_config.networkName+".infura.io/RkeQNk1tmz2SlNBIFu2X"));
    }
    web3.eth.defaultAccount = web3.eth.accounts[0];
    console.log('web3.eth.defaultAccount',web3.eth.defaultAccount)
    web3.version.getNetwork(function(err,result){ 
        console.log("Network version, Error:",err,"RESULT:",result)
        netWork = result;
        $("#data_network").html("<b>Network:</b>"+_config.networkName+"<br>"+"<b>Contract Address:</b>"+_config.contractAddress)
    })
    window.contract = web3.eth.contract(_config.contractAbi).at(_config.contractAddress);
    window.contract.participants.call(function(err,result){
        console.log(err,result)
        if(!err){
            console.log('no hay error');
        }
    });*/
});