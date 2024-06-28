const extractArrayFromResult = (resultString: string) => {
    const arrayMatch = resultString.match(/MongoDB ConnectedResul: (\[.*\])/);
    if (arrayMatch && arrayMatch[1]) {
        return JSON.parse(arrayMatch[1]);
    } else {
        return new Error('Array not found in the result string');
    }
};


export default extractArrayFromResult;
