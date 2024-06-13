const controller = (req, res) => {
    const { query } = req.body;
    if (!query)
        return res.status(400).json({
            status: "error",
            message: "Query is required",
        });
};
export default controller;
//# sourceMappingURL=ask_controller.js.map