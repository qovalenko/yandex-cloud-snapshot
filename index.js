const CronJob = require('cron').CronJob,
    request = require('request'),
    jose = require('node-jose'),
    fs = require('fs')

var key = fs.readFileSync(require.resolve('./key/private.pem'))

var serviceAccountId = ''
var keyId = ''
var now = Math.floor(new Date().getTime() / 1000);

var payload = {
    aud: "https://iam.api.cloud.yandex.net/iam/v1/tokens",
    iss: serviceAccountId,
    iat: now,
    exp: now
};

function go() {
    jose.JWK.asKey(key, 'pem', {kid: keyId, alg: 'PS256'})
        .then(function (result) {
            jose.JWS.createSign({format: 'compact'}, result)
                .update(JSON.stringify(payload))
                .final()
                .then(function (JwkToken) {
                    let option = {
                        url: 'https://iam.api.cloud.yandex.net/iam/v1/tokens',
                        method: 'post',
                        qs: {
                            jwt: JwkToken
                        }
                    }

                    list.headers.Authorization = 'Bearer '
                    create.headers.Authorization = 'Bearer '
                    del.headers.Authorization = 'Bearer '

                    request(option, function (ErrorToken, ResponseToken, BodyToken) {
                        let token = JSON.parse(BodyToken).iamToken
                        list.headers.Authorization = list.headers.Authorization + token
                        create.headers.Authorization = create.headers.Authorization + token
                        del.headers.Authorization = del.headers.Authorization + token
                        request(list, GetListSnapShot)
                    });
                });
        });
}
let period,
    list = {
        url: 'https://compute.api.cloud.yandex.net/compute/v1/snapshots',
        qs: {
            folderId: ''
        },
        headers: {
            'Authorization': 'Bearer '
        }
    },
    create = {
        url: 'https://compute.api.cloud.yandex.net/compute/v1/snapshots',
        method: 'post',
        qs: {
            folderId: '',
            diskId: ''
        },
        headers: {
            'Authorization': 'Bearer '
        }
    },
    del = {
        url: 'https://compute.api.cloud.yandex.net/compute/v1/snapshots/',
        method: 'delete',
        headers: {
            'Authorization': 'Bearer '
        }
    }
function DelSnapShot(errorDel, responseDel, bodyDel) {
    if (!errorDel && responseDel.statusCode == 200) {
        create.qs.description = period
        request(create, CreateSnapShot)
        console.log('SnapShotDel')
    } else {
        console.log('errorDel')
        console.log(errorDel)
    }
}

function CreateSnapShot(errorCreate, responseCreate, bodyCreate) {
    if (!errorCreate && responseCreate.statusCode == 200) {
        console.log('SnapShotCreate')
    } else {
        console.log(errorCreate)
    }
}


function GetListSnapShot(errorList, responseList, bodyList) {
    if (!errorList && responseList.statusCode == 200) {
        let List = JSON.parse(bodyList)
        List
            .snapshots
            .sort((a,b) => (new Date(a.createdAt).getTime() > new Date(b.createdAt).getTime()) ? 1 : ((new Date(b.createdAt).getTime() > new Date(a.createdAt).getTime()) ? -1 : 0))
            //.some(item => {
            //    console.log(new Date(item.createdAt).getTime())
            //})
            .some(item => {
                    if (item.description === period) {
                        let delSpanShot = del
                        delSpanShot.url = delSpanShot.url + item.id
                        request(delSpanShot, DelSnapShot)
                        return true
                    }
                })
    } else {
        console.log('errorList')
    }
}

period = 'day'
go()
