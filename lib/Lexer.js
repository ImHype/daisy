const {INIT, OPEN_TAG, OPEN_COMMENT, COMMENT, CLOSE_TAG, END_TAG, TAGNAME, TAG, EXPR, TEXT, ATTR, EQUAL, VALUE, EOF} = require('./StateTypes');
//  
function isSpace(letter) {
    const code = letter.charCodeAt(0);
    return code == 32;
}

// a-z
function isLowerCase(letter) {
    const code = letter.charCodeAt(0);
    return code >= 97 && code <= 122;
}

// A-Z
function isUpperCase(letter) {
    const code = letter.charCodeAt(0);
    return code >= 65 && code <= 90;
}

function isWord(letter) {
    return isLowerCase(letter) || isUpperCase(letter);
}

// 0-9
function isNumber(letter) {
    const code = letter.charCodeAt(0);
    return code >= 48 && code <= 57;
}

// _
function isUnderscore(letter) {
    const code = letter.charCodeAt(0);
    return code === 95;
}

// $
function isDollar(letter) {
    const code = letter.charCodeAt(0);
    return code === 36;
}

// !
function isExclamationMark (letter) {
    const code = letter.charCodeAt(0);
    return code === 33;
}

// !
function isDash (letter) {
    const code = letter.charCodeAt(0);
    return code === 45;
}

// <
function isOpenTag(letter) {
    const code = letter.charCodeAt(0);
    return code === 60;
}

// >
function isCloseTag(letter) {
    const code = letter.charCodeAt(0);
    return code === 62;
}

// {
function isOpenExpr(letter) {
    const code = letter.charCodeAt(0);
    return code === 123;
}

// }
function isCloseExpr(letter) {
    const code = letter.charCodeAt(0);
    return code === 125;
}

// /
function isSlash(letter) {
    const code = letter.charCodeAt(0);
    return code === 47;
}

// =
function isEqual(letter) {
    const code = letter.charCodeAt(0);
    return code === 61;
}

// '||"
function isQuote(letter) {
    const code = letter.charCodeAt(0);
    return code === 34 || code === 39;
}

function mergeTextTokens(tokens) {
    let index = 0;
    return tokens.reduce((list, token) => {
        const prevToken = list[index - 1];

        if ((token.type === TEXT) && prevToken && (prevToken.type === TEXT)) {
            prevToken.content += token.content;
        } else {
            list.push(token);
            index++;
        }
        return list;
    }, []);
}

function Lexer(source) {
    let states = [];
    let pos = 0;
    let tokens = [];
    let temp = [];
    let letter;

    pushState(INIT);

    /* eslint-disable */
    while (letter = source[pos]) {
    /* eslint-enable */
        const state = getState();
        if (state === INIT) {
            if (isOpenTag(letter)) {
                if (isSlash(getNextLetter())) {
                    if (isSpace(getNextLetter(2))) {
                        pushToTemp(letter);
                        next();
                        pushState(TEXT);
                    } else {
                        pushState(END_TAG);
                        next(2);
                    }
                } else if (isExclamationMark(getNextLetter())
                    && isDash(getNextLetter(2))
                    && isDash(getNextLetter(3))
                ) {
                    next(4);
                    pushState(OPEN_COMMENT);
                } else {
                    if (isSpace(getNextLetter())) {
                        pushToTemp(letter);
                        next();
                        pushState(TEXT);
                    } else {
                        pushState(OPEN_TAG);
                        next();
                    }
                }
            } else if (isOpenExpr(letter)) {
                pushState(EXPR);
                next();
            } else {
                pushState(TEXT);
            }
            resetTemp();
        } else if (state === OPEN_TAG) {
            if (isSpace(letter)) {
                next();
            } else {
                pushState(TAGNAME);
                resetTemp();
            }
        } else if (state === TAGNAME) {
            if (isSpace(letter)) {
                pushToken(TAGNAME);
                pushState(TAG);
                resetTemp();
            } else if ((isSlash(letter) && isCloseTag(getNextLetter()))) {
                setTokenSelfClose(pushToken(TAGNAME));
                next();
                pushState(TAG);
                resetTemp();
            } else if (isCloseTag(letter)) {
                pushToken(TAGNAME);
                pushState(TAG);
            } else {
                next();
                pushToTemp(letter);
            }
        } else if (state === TAG) {
            if (isCloseTag(letter)) {
                pushState(CLOSE_TAG);
            } else if (isSpace(letter)) {
                next();
            } else {
                pushState(ATTR);
                resetTemp();
            }
        } else if (state === ATTR) {
            if (isEqual(letter)) {
                pushToken(ATTR);
                next();
                pushState(EQUAL);
                resetTemp();
            } else if (isSpace(letter)) {
                next();
                pushToken(ATTR);
                resetTemp();
            } else if (isCloseTag(letter)) {
                pushToken(ATTR);
                pushState(TAG);
            } else {
                next();
                pushToTemp(letter);
            }
        } else if (state === EQUAL) {
            if (isQuote(letter)) {
                pushToTemp(letter);
                next();
                pushState(VALUE);
            } else if (isSpace(letter)) {
                next();
            } else if (isCloseTag(letter)) {
                pushState(TAG);
            } else {
                pushState(VALUE);
            }
        } else if (state === CLOSE_TAG) {
            popState(CLOSE_TAG);

            if (isAttrState()) {
                while (isAttrState()) {
                    popState();
                }
            }

            popState(TAGNAME);
            popState(OPEN_TAG);
            
            next();
            resetTemp();
        } else if (state === VALUE) {
            if (
                isQuote(letter) && letter === temp[0] && getPrevLetter() !== '//'
            ) {
                pushToTemp(letter);
                pushToken(VALUE);
                next();
                pushState(TAG);
            }  else if (isSpace(letter)) {
                if (isQuote(temp[0])) {
                    next();
                    pushToTemp(letter);
                } else {
                    pushToken(VALUE);
                    next();
                    pushState(TAG);
                }
            } else if (isCloseTag(letter)) {
                pushToken(VALUE);
                pushState(TAG);
            } else {
                next();
                pushToTemp(letter);
            }
        } else if (state === END_TAG) {
            if (isSpace(letter)) {
                next();
            } else if (isCloseTag(letter)) {
                pushToken(END_TAG);
                popState(END_TAG);
                next();
            } else {
                pushToTemp(letter);
                next();
            }
        } else if (state === EXPR) {
            if (isOpenExpr(letter)) {
                pushToTemp(letter);
                pushToken(TEXT);
                resetTemp();
                next();
            } else if (isCloseExpr(letter)) {
                pushToken(EXPR);
                next();
                popState(EXPR);
            } else {
                pushToTemp(letter);
                next();
            }
        } else if (state === TEXT) {
            if (isOpenTag(letter) || isOpenExpr(letter)) {
                pushToken(TEXT);
                popState();
            } else {
                pushToTemp(letter);
                next();
            }
        } else if (state === OPEN_COMMENT) {
            if (isDash(letter) && isDash(getNextLetter()) && isCloseTag(getNextLetter(2))) {
                pushToken(COMMENT);
                next(3);
                popState();
            } else {
                next();
                pushToTemp(letter);
            }
        }
    }

    let rollBackPos = -1;
    while (states.length !== 1){
        switch (getState()) {
        case OPEN_COMMENT:
            pushToken(COMMENT);
            popState();
            break;
        case TEXT:
            pushToken(TEXT);
            popState();
            break;
        case TAG:
        case TAGNAME:
        case OPEN_TAG:
            rollBackPos = states[states.length - 1].pos;
            popState();
            break;
        case EXPR:
            rollBackPos = states[states.length - 1].pos;
            popState();
            break;
        }
    }

    if (states.length !== 1) {
        throw `unparsable codes: ${getContentFromTemp()}`;
    }

    resetTemp();
    pushToTemp(source.substr(rollBackPos));
    pushToken(TEXT);

    tokens = mergeTextTokens(tokens);

    tokens = [...tokens, {
        type: EOF
    }];

    return tokens;

    function next(i = 1) {
        pos += i;
    }

    function pushState(nextState) {
        states.push({
            state: nextState,
            pos
        });
    }

    function pushToken(type) {
        const sourceFragment = source.substr(0, pos);
        const matchLines = sourceFragment.match(/\n/g);
        const matchColumns = sourceFragment.match(/[^\n]*$/g);
        const line = (matchLines && matchLines.length) + 1;
        const column = (matchColumns && matchColumns.length);

        const token = {
            type,
            content: getContentFromTemp(),
            pos: pos,
            line,
            column
        };

        tokens.push(token);

        return token;
    }

    function pushToTemp(item) {
        temp.push(item);
    }

    function resetTemp() {
        temp.length = 0;
    }

    function getContentFromTemp() {
        return temp.join('');
    }

    function getPrevLetter(i = 1) {
        return source[pos - i];
    }

    function getNextLetter(i = 1) {
        return source[pos + i];
    }

    function setTokenSelfClose(token) {
        token.isSelfClose = true;
    }

    function getState() {
        return (states[states.length - 1] || {}).state;
    }

    function popState(expectState) {
        if (!expectState) {
            return states.pop();
        }

        if (getState() === expectState) {
            return states.pop();
        }
        throw `Check your syntax - expect state ${expectState}, but actual state is ${getState()}`;
    }

    function isAttrState() {
        return ~[TAG, ATTR, EQUAL, VALUE].indexOf(getState());
    }
}

exports.Lexer = Lexer;