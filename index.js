'use strict';

/**
 * Author - Atishay Jain
 * email - jainatishay.j@gmail.com
 */
    
//dependencies
var fs = require('fs');
var MongoClient = require('mongodb').MongoClient;
var path = require('path');
//var AWS = require('aws-sdk');


//constants
var methods_const = ['hard-delete', 'move-with-log'];


/**
 * 
 * @param {Array} strings - []
 * @param {Object} db - { db : ['dbName'] }
 */
function validator(strings, db){
    var errorFlag = false;
    strings.map( function(v, i) {
        if( !v || v.constructor !== String ){
            errorFlag = true;
        }
    })
    if( !db || db.constructor !== Object || !db.dbName ){
        errorFlag = true;
    }
    // if( ( db && db.dbUserName && !db.dbPassword ) || (db && db.dbPassword && !db.dbUserName ) ){
    //     errorFlag = true;
    // }
    if( errorFlag ){
        return false;
    }
    return true;
}

/**
 * 
 * @param {Object} errorMessage 
 */
function error( errorMessage ) {
    console.error('npm error : ' + errorMessage);
}

function print( message ){
    // console.log(message);
}

function printAlways( message ){
    console.log(message);
}

/**
 * 
 * @param {Array} files 
 */
function hardDelete(files) {
    try {
        print('hard delete');
        print('files to hard delete');
        // print(files);
        fs.readFile('log-' + (new Date()).toLocaleDateString() + '.txt',function(err, file){
            if(!file) {
                var file = '';
            }
            file = file.toString() || '';
            print(file.toString());
            file += '\r\n \r\n';
            file += 'DELETED FILES ON - ' + (new Date()).toISOString();
            files.map(function(v, i) {
                file += '\r\n ' + v + ' deleted permanently';
                // fs.unlink(v, function(err){
                //     if(err) error(err);
                // });
            })
            fs.writeFile('log-' + (new Date()).toLocaleDateString() + '.txt', file, function (err) {
                printAlways('Saved!');
            });
        })
    } catch ( err ) {
        error(err);
    }
}

/**
 * 
 * @param {Array} files
 * logic - loop -> convert the string to array -> check for each iteration -> when done move the file to the location
 */
function moveWithLog(files, s3) {
    try {
        if( s3 ){
            if( s3.region ){
                s3.region = 'ap-south-1';
            }
            AWS.config.update({
                accessKeyId: s3.accessKeyId,
                secretAccessKey: s3.secretAccessKey,
                region: s3.region
            });
            var s3bucket = new AWS.S3({ params: { Bucket: s3.bucketName } })
        }
        var path = './filesCleaner';
        if ( !fs.existsSync(path) ){
            fs.mkdirSync(path);
        }
        print('move the file to /npm with an entry in log.txt');
        // print(files);
        fs.readFile('log-' + (new Date()).toLocaleDateString() + '.txt', function(err, file){
            if( !file) {
                var file = '';
            }
            file = file.toString() || '';
            // print(file.toString());
            file += '\r\n \r\n';
            file += 'FILES MOVED ON - ' + (new Date()).toISOString();
            var filesAP = files.map(function(v, i) {
                file += '\r\n ' + v + ' moved to filesCleaner folder.';
                return checkPathAndStore(v, path);              
            })
            Promise.all(filesAP).then( function(filesAPP){
                printAlways('Saved!');
                fs.writeFile('log-' + (new Date()).toLocaleDateString() + '.txt', file, function (err) {
                });
            }).catch( function(err) {
                error(err);
            })        
        })
    } catch (err) {
        error(err);
    }
}
/**
 * 
 * @param {Array} files 
 * @param {String} file 
 */
function checkPathAndStore(v, path) {
    return new Promise(function(resolve, reject) {
        if(!v.length){
            var err = new Error('Params Missing');
            return reject(err)
        }
        var temp = './filesCleaner/' + v;
        temp = temp.split('/');
        temp.pop();
        // print('temp');
        // print(temp);
        if(temp.length) {
            print('start');
            print(v);
            var path = temp[0];
            print('path');
            print(temp);
            if(!path){
                return reject();
            }
            temp.map( function (value, index){
                if(index == 0){
                    return;
                }
                print('value');
                print(value);
                path += '/' + value;
                // temp = temp.join('/');
                print('path');
                print(path);
                if (!fs.existsSync(path)){
                    fs.mkdirSync(path);
                }
            })
        }
        fs.rename(v, './filesCleaner/' + v, (err) => {
            if (err) return reject(err);
            print('Files Moved Succesfully complete!');
        });
        return resolve();
    })
}


//search directory inside directory
/**
 * 
 * @param {String} directory 
 * @param {Array} fileArray 
 */
var searchDirectory = function(directory, fileArray, include, exclude) {
    var files = fs.readdirSync(directory);
    fileArray = fileArray || [];
    files.forEach(function(file) {
        if (fs.statSync(directory + '/' + file).isDirectory()) {
            fileArray = searchDirectory(directory + '/' + file, fileArray, include, exclude);
        }
        else {
            if( file[0] !== '.' ){
                file = directory + '/' + file;
                var extension = path.extname(file).substring(1);
                extension = extension.toLowerCase();
                if( include && include.indexOf(extension) != -1 ){
                    fileArray.push(file);
                } else if( exclude && exclude.indexOf(extension) == -1 ){
                    fileArray.push(file);
                } else if ( !exclude && !include ) {
                    fileArray.push(file);
                }
            }
        }
    });
    return fileArray;
};


/* *
 * folderDir - @param String folder directory in which all the images are present // public folder
 * method - @param String 'hard-delete' or 'move-with-log'
 * 'hard-delete' - it will delete the file permanentally from server
 * 'move-with-log' - it will move the file from one directory to another if file is unlined with db
 * db - @param Object it consists of dbName, dbUsername and dbPassword,     
 * */
function action(folderDir, method, db, additional){
    try {
        var cron;
        if(additional && additional.constructor == Object && Object.keys(additional)){
            cron = additional.cron;
        }
        var flag = validator([folderDir, method], db);
        if( !flag ){
            error('Wrong Parameters passed - please refer the docs');
            return;
        }
        if( folderDir.indexOf('..') != -1 ){
            return error('can\'t use `..` in folderDir');
        }
        if( cron ){
            cron = parseFloat(cron);
            if( !cron ) throw new Error('Wrong CRON value');
            setInterval( function() {
                print("STARTED - cron " + cron);
                getFiles(folderDir, method, db, additional);
            }, cron);
        } else {
            print("STARTED no cron " + cron);
            getFiles(folderDir, method, db, additional);
        }
    } catch ( err ) {
        error(err);
    }
}
function getFiles(folderDir, method, db, additional){
    try {
        var include;
        var exclude;
        var s3;
        if( additional.s3 ){
            if( additional.s3Creds.bucket && additional.s3Creds.accessKeyId && additional.s3Creds.secretAccessKey ){
                s3 = additional.s3Creds;
            }
        }
        if( additional.files && additional.files.constructor == Object && Object.keys(additional.files).length ){
            if( additional.files.include ) {
                var temp = additional.files.include.map( function(x) {
                    return x.toLowerCase();
                })
                include = temp;
            } else if( additional.files.exclude ){
                var temp = additional.files.exclude.map( function(x) {
                    return x.toLowerCase();
                });
                exclude = temp;
            }
        }
        fs.readdir(folderDir, function (err, files) {
            if (err) throw err;
            if( !files ){
                return error('wrong directory');
            }
            if( !files.length ){
                return error('no files present in the directory');
            }
            var tempfolderDir = folderDir;
            if( tempfolderDir[0] == '.' || tempfolderDir[0] == '/' ) {
                tempfolderDir = tempfolderDir.split('');
                tempfolderDir.shift();
                tempfolderDir = tempfolderDir.join('');
                if( tempfolderDir[0] == '/' ){
                    tempfolderDir = tempfolderDir.split('');
                    tempfolderDir.shift();
                    tempfolderDir = tempfolderDir.join('');
                }
            }
            var dir = searchDirectory(tempfolderDir, [], include, exclude);
            print('dir');
            print(dir);
            // files.forEach(function(v, i){
            //     files[i] = __dirname + '/' + tempfolderDir + '/' + v;
            // })
            //making files array
            //connect db
            // if(db.dbPassword || db.dbUsername){
            //     dbUrl.dburl += 
            //     // handle the url string
            // }
            // print(db.dbUrl);
            MongoClient.connect(db.dbUrl,{ useNewUrlParser: true }, function(err, client) {
                if(err) throw err;
                print("Connected successfully to Database");
                
                const database = client.db(db.dbName);
                var dbFilesTemp = Object.keys(db.models).map(function(v, i) {
                    return getDBData(v, database, db.models[v]);
                })
                // var dbFiles = ['./public/a.txt', './public/b.txt', '/public/images/h.txt'];
                Promise.all(dbFilesTemp).then(function(dbFiles) {
                    dbFiles = dbFiles.filter(Boolean);
                    dbFiles = [].concat.apply([], dbFiles);
                    var AllStrings = dbFiles.map(function(v, i) {
                        return convertString(v);
                    })
                    dbFiles = AllStrings;
                    print("Successfully disconnect to Database");
                    client.close();
                    if(!dbFiles){
                        endCode();
                        return;
                    }
                    var dbFilesFiltered = [];
                    dbFiles.map(function (v, i){
                        dbFilesFiltered[i] = dbFiles[i].split('/');
                        if( dbFilesFiltered[i].length > 0 ){
                            if(dbFilesFiltered[i][0] == '.' && dbFilesFiltered[i].length){
                                // print(dbFilesFiltered[i]);
                                dbFilesFiltered[i].shift();
                            }
                            // if(dbFilesFiltered[i][0] == '/' && dbFilesFiltered[i].length){
                            //     // print(dbFilesFiltered[i]);
                            //     dbFilesFiltered[i].shift();
                            // }
                        }
                        dbFilesFiltered[i] = dbFilesFiltered[i].filter(Boolean);
                        print('dbFilesFiltered[i]');
                        print(dbFilesFiltered[i]);
                        dbFilesFiltered[i] = dbFilesFiltered[i].join('/');
                    })
                    print('dbFiles - Filtered')
                    print(dbFilesFiltered);
    
                    //get common files from dbFilesFiltered && dir
                    // NOTE: CHANGE THE ALGORITHM
                    /**
                     * @param { Array } dbFilesFiltered - Files concieved from db
                     * @param { Array } dir - Files read by the fs module
                     */
                    // var usingItNow = function(callback) {
                    //     var myError = new Error('My custom error!');
                    //     callback(myError, 'get it?'); // I send my error as the first argument.
                    //   };
                      
                    getCommonFiles( dbFilesFiltered, dir, function(err, common){
                        if (err) throw err;
                        // common - ['/public/a.txt', '/public/b.txt'];
                        switch ( method ){
                            case methods_const[0]:
                                return hardDelete(common);
                            case methods_const[1]:
                                // if (!to) {
                                //     return error('Please Specify the `to` parameter');
                                // }
                                return moveWithLog(common, s3);
                            default:
                                return error('wrong method key');
                        }
                    })
    
                }).catch(function(err){
                    error(err);
                })
            });
        })
    } catch ( err ) {
        error(err);
    }
}
function endCode() {
    print("ENDING CODE")
}
/**
 * 
 * @param {Object || String} data
 * @param {String} response
 */
function convertString(data){
    if(data.constructor === Object) {
        if(Object.keys(data).length == 1){
            // print(Object.keys(data));
            // print('data');
            // print(data[Object.keys(data)[0]]);
            return data[Object.keys(data)[0]];
        }
    }else if(data.constructor === String) {
        print('string');
        return data;
    }else {
        print('some other data type or object have more than one key');
        return null;
    }
}
/**
 * 
 * @param {String} model
 * @param {Class} db 
 * @param {Array} fields 
 */
function getDBData(model, db, fields) {
    return new Promise(function(resolve, reject) {
        try {
            if(!model || !db){
                return resolve();
            }
            db.collection(model).find({}).toArray(function(err, data) {
                var dataFinal = data.map(function(v, i){
                    return pick(v, fields);
                })
                return resolve(dataFinal);
            });
        } catch ( err ) {
            console.error(err);
            reject(err);
        }
    })
}
/**
 * 
 * @param { Object } object 
 * @param { Array } fields
 */
function pick(object, fields){
    var finalObject = {}; 
    Object.keys(object).map(function(v, i) {
        if(fields.indexOf(v) != -1){
            finalObject[v] = object[v];
        }
    })
    return finalObject;
}
/**
 * 
 * @param {Array} dbFiles 
 * @param {Array} dirFiles 
 * @param {function} callback 
 */
function getCommonFiles( dbFiles, dirFiles, callback){
    try {
        /* 
            let a = new Set([1,2,3]);
            let b = new Set([4,3,2]);
            let difference = new Set(
                [...a].filter(x => !b.has(x)));
            // {1}
         */
        var dbFilesSet = new Set(dbFiles);
        var dirFilesSet = new Set(dirFiles);
        var difference = new Set([...dirFilesSet].filter(x => !dbFilesSet.has(x)));
        callback(null, [...difference]);
    } catch ( err ) {
        callback(err, 'error');
    }
}

// always read the files first to make sure that os files are not removed
/**
 * 
 * @param {String} folderDir 
 */
function readFileNames(folderDir) {
    try {
        if( !folderDir ){
            return error('Wrong params');
        }
        fs.readdir(folderDir, function (err, files){
            if( !files ){
                return error('wrong directory');
            }
            if( !files.length ){
                return error('no files present in the directory');
            }
            // print(files)
            return files;
        })
    } catch (err){
        error(err)
    }
}
// readFileNames('./'); // models:{ {model_name} : [key_name1, key_name2] }
// dbUrl -> add mongoose.connect('mongodb://username:password@host:port/database?options...'); change URL according to the need;
// if same extension comes in both include and exclude it'll consider it only include. NOTE: only one can used at a time
// action('./public', 'move-with-log', { dbName: 'test', dbUrl : 'mongodb://localhost:27017', models: { 'test': ['1','2','3'], 'test2': ['1'] } }, { cron: '1', files:{ include:['jpg', 'txt'], exclude:['js'], s3: true, s3Creds: { bucketName: '', accessKeyId: '', secretAccessKey: '', region: '' } } );

module.exports = { action: action, readFileNames: readFileNames };


// suggestion: always have a maximum layer that i.e. above that it should not delete
// for e.g ./public -> max layer
// for e.g. so it won't be able to delete ./ directory files.


// FEATURES WHICH CAN BE ADDED

// upload S3 - L
// delete S3 files - L
// log file location - M
// date format time zone - L
// new location dynamic - M
// mail changes - L
// take file created date in account - M
// Delete Move-With-log after some time - M - NOT REQUIRED MOVE TO S3 BETTER OPTION
// TEST CASES - M


// PRIORITY LIST

// C - Critical
// H - High
// M - Medium
// L - Low


// FEATURES COMPLETED

// recursively create folders for rename folder - H
// Add CRON - H
// mongo db password and username along with link - H
// Error Handling (Show Error) - H
// extension delete - L
// BUG - EXTENSION DELETE - LETTERS CASE CHECK NOT THERE

