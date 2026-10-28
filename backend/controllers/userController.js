const removeTag = async (req, res) => {
  try {
    await req.ownedRecord.destroy();
    res.status(200).send("successfully deleted tag or bookmark");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
};

export { removeTag };
