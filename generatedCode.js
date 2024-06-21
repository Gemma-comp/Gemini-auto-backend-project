const fact = num => num <= 1 ? 1 : num * fact(num - 1);
console.log(fact(8));
