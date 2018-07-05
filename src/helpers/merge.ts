function isObject(item: any) {
  return typeof item === "object" && !Array.isArray(item) && item !== null;
}

function merge(target: any, source: any) {
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!target[key]) {
          Object.assign(target, { [key]: {} });
        }
        merge(target[key], source[key]);
        return;
      }

      if (Array.isArray(target[key]) && Array.isArray(source[key])) {
        Object.assign(target, { [key]: [...target[key], ...source[key]] });
        return;
      }

      Object.assign(target, { [key]: source[key] });
    });
  }
  return target;
}

export default merge;
