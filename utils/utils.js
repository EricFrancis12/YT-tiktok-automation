function formatDate(timestamp) {
    const d = new Date(timestamp);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
}



function isEmpty(any) {
    return any === null || any === undefined || any === '';
}

function isArray(any) {
    return Object.prototype.toString.call(any) === '[object Array]';
}



function arrHasAnElementWithGivenKeyAndGivenValue(arr, key, value) {
    if (!isArray(arr) || typeof key !== 'string') {
        throw new Error(`Argument type error at function: ${this.name}`);
    }

    for (let i = 0; i < arr.length; i++) {
        if (arr[i][key] === value) {
            return true;
        }
    }

    return false;
}





module.exports = {
    formatDate,
    isEmpty,
    isArray,
    arrHasAnElementWithGivenKeyAndGivenValue
}