const defaultDict = new Proxy({}, {
    get: (target: any, name) => name in target ? target[name] : 0
});