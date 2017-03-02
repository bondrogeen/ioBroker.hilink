![Logo](admin/hilink.png)

# ioBroker.hilink
=================

Драйвер для USB модемов Huawei с прошивками Hilink.

Совместимость E3372 (МТС 827F/829F, МегаФон M150-2, Билайн E3372/E3370, TELE2 E3372р-153

- чтение входящих и исходящих сообщений.
- отправка сообщений.
- отправка ussd запросов.
- получение основных параметров модема, информация о трафике.


```javascript

//  Подключение 'conect', отключение 'desconect' от сети и перезагрузка модема 'reboot'

sendTo("hilink.0",'control','reboot',function (response){
    log(JSON.stringify( response, null, 2 ));
});

sendTo("hilink.0",'control','conect');

// отправка сообщения
sendTo("hilink.0",'send',{
    phone:  '+7123456789', // номер телефона
    message:  'Проверка работы' // текст сообщение
    },function (response){
    log(JSON.stringify( response, null, 2 ));
});

sendTo("hilink.0",'send',{phone:'+79097744733',message:  'Проверка работы'});


// чтение сообщений 
sendTo("hilink.0",'read','inbox',function (response){
     log(JSON.stringify( response, null, 2 ));
});

/*
'inbox' входящих, 
'outbox' исходящих, 
'new' чтение входящих только новые сообщение 
*/


//отправка ussd запроса
sendTo("hilink.0",'ussd','*100#',function (response){
     log(JSON.stringify( response, null, 2 ));
});

// удаление одного сообщения с индексом '40002'
sendTo("hilink.0",'delete','40002',function (response){
     log(JSON.stringify( response, null, 2 ));
});

// очистка всех 'outbox' исходящих, 'inbox' входящих сообщений
sendTo("hilink.0",'clear','outbox',function (response){
     log(JSON.stringify( response, null, 2 ));
});

// изменить статус 'all' всех  сообщений на прочитанные или если указать '40002' индекс, только одного
sendTo("hilink.0",'setRead','all',function (response){
    log(JSON.stringify( response, null, 2 ));
});

sendTo("hilink.0",'setRead','40002');
```

## Changelog

#### 0.0.1
* (bondrogeen) initial release
