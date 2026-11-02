import PreNav from "../components/Navbar/PreNav";
import CategoriesInfo from "../components/Cards/CategoriesInfo";
import { useEffect, useState } from "react";
import axios from "../api/axiosInstance";
import { Plus } from "../assets";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import Toast from "../components/Toast/Toast";
import Loader from "../components/Loader/Loader";

const Categories = () => {
  const [categoriesList, setCategoriesList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCategoryInput, setnewCategoryInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Completed successfully");
  const [toastType, setToastType] = useState("success");
  const { user, setCategoryNeedsUpdate, categoryNeedsUpdate } = useAuth();
  const isAdmin = user.role === "admin";
  useEffect(() => {
    const fetchCategory = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get("/api/category/-1", {
          withCredentials: true,
        });
        setCategoriesList(data);
        setLoading(false);
      } catch (error) {
        console.error(error);
      }
    };
    fetchCategory();
  }, []);
  const addCategoryBackend = async (category) => {
    try {
      const catogories = await axios.post("/api/admin/category", category, {
        withCredentials: true,
      });
      return catogories;
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddCategory = async () => {
    setShowToast(false);
    if (newCategoryInput.trim()) {
      const newCategory = {
        name: newCategoryInput.trim(),
      };
      setToastType("warning");
      setToastMessage("adding category");
      setShowToast(true);
      const category = await addCategoryBackend(newCategory);
      setCategoriesList(category.data);
      setnewCategoryInput("");
      setToastType("success");
      setToastMessage("category added");
      setShowToast(true);
      setIsModalOpen(false);
      setCategoryNeedsUpdate(categoryNeedsUpdate + 1);
    } else {
      setToastType("error");
      setToastMessage("name can't be empty when adding category");
      setShowToast(true);
    }
  };
  return (
    <>
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          duration={3000}
          onClose={() => setShowToast(false)}
        />
      )}
      <PreNav name={"Categories"} />

      {loading && <Loader />}
      {!loading && (
        <div className="categories-container">
          {isAdmin && (
            <div className="categories" onClick={() => setIsModalOpen(true)}>
              <div className="new-category">
                <Plus />
                Add New Category
              </div>
            </div>
          )}
          {isModalOpen && (
            <div className="modal-overlay">
              <div className="modal small-modal">
                <div className="add-user-modal">
                  <div className="modal-heading">Add new category</div>
                  <input
                    type="text"
                    className="input"
                    value={newCategoryInput}
                    onChange={(e) => setnewCategoryInput(e.target.value)}
                  />
                  <div className="modal-buttons-group-user">
                    <motion.div
                      className="modal-buttons"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      style={{ color: "#00a6a6" }}
                      onClick={handleAddCategory}
                    >
                      Add
                    </motion.div>
                    <motion.div
                      className="modal-buttons"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      style={{ color: "#45312d" }}
                      onClick={() => setIsModalOpen(false)}
                    >
                      Cancel
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {categoriesList.map((e) => (
            <CategoriesInfo
              name={e.category}
              categoryId={e.id}
              setCategoriesList={setCategoriesList}
              setCategoryNeedsUpdate={setCategoryNeedsUpdate}
              categoryNeedsUpdate={categoryNeedsUpdate}
              setShowToast={setShowToast}
              setToastMessage={setToastMessage}
              setToastType={setToastType}
              key={e.id}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default Categories;
