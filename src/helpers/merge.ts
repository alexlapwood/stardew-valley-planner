function isObject(item: any) {
  return (
    item && typeof item === "object" && !Array.isArray(item) && item !== null
  );
}

function merge(target: any, source: any) {
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!target[key]) {
          Object.assign(target, { [key]: {} });
        }
        merge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    });
  }
  return target;
}

export default merge;
