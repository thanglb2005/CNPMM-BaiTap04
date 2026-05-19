const Product = require('./product.model');
const Category = require('../category/category.model');
const { HttpResponse } = require('../../shared/utils/apiResponse');
const { AppException } = require('../../shared/errors/AppError');

const getProducts = async (req, res) => {
  const {
    page = 1,
    limit = 12,
    category,
    author,
    minPrice,
    maxPrice,
    publishYear,
    search,
    sortBy = 'createdAt',
    order = 'desc',
    isNew,
    isFeatured,
    isBestseller,
  } = req.query;

  const query = { isActive: true };

  if (category) {
    const cat = await Category.findOne({ slug: category }).lean();
    if (cat) {
      query.category = cat._id;
    }
  }

  if (author) {
    query.author = { $regex: author, $options: 'i' };
  }

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  if (publishYear) {
    query.publishYear = Number(publishYear);
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { author: { $regex: search, $options: 'i' } },
    ];
  }

  if (isNew === 'true') query.isNew = true;
  if (isFeatured === 'true') query.isFeatured = true;
  if (isBestseller === 'true') query.isBestseller = true;

  const sortOptions = {};
  if (sortBy === 'price') {
    sortOptions.price = order === 'asc' ? 1 : -1;
  } else if (sortBy === 'price-desc') {
    sortOptions.price = -1;
  } else if (sortBy === 'soldQuantity') {
    sortOptions.soldQuantity = -1;
  } else if (sortBy === 'name') {
    sortOptions.name = order === 'asc' ? 1 : -1;
  } else {
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('category', 'name slug')
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Product.countDocuments(query),
  ]);

  res.status(200).json(HttpResponse.success({
    products,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
      hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
      hasPrevPage: Number(page) > 1,
    },
  }, 'Lấy danh sách sản phẩm thành công'));
};

const getNewProducts = async (req, res) => {
  const { limit = 8 } = req.query;
  const products = await Product.find({ isActive: true, isNew: true })
    .populate('category', 'name slug')
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();

  res.status(200).json(HttpResponse.success(products, 'Lấy sản phẩm mới thành công'));
};

const getBestsellers = async (req, res) => {
  const { limit = 10, page = 1 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [products, total] = await Promise.all([
    Product.find({ isActive: true })
      .populate('category', 'name slug')
      .sort({ soldQuantity: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Product.countDocuments({ isActive: true }),
  ]);

  res.status(200).json(HttpResponse.success({
    products,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
      hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
      hasPrevPage: Number(page) > 1,
    },
  }, 'Lấy sản phẩm bán chạy thành công'));
};

const getMostViewed = async (req, res) => {
  const { limit = 10, page = 1 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [products, total] = await Promise.all([
    Product.find({ isActive: true })
      .populate('category', 'name slug')
      .sort({ viewCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Product.countDocuments({ isActive: true }),
  ]);

  res.status(200).json(HttpResponse.success({
    products,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
      hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
      hasPrevPage: Number(page) > 1,
    },
  }, 'Lấy sản phẩm xem nhiều nhất thành công'));
};

const getFeaturedProducts = async (req, res) => {
  const { limit = 8 } = req.query;
  const products = await Product.find({ isActive: true, isFeatured: true })
    .populate('category', 'name slug')
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();

  res.status(200).json(HttpResponse.success(products, 'Lấy sản phẩm nổi bật thành công'));
};

const getProductBySlug = async (req, res) => {
  const { slug } = req.params;
  const product = await Product.findOneAndUpdate(
    { slug, isActive: true },
    { $inc: { viewCount: 1 } },
    { new: true }
  )
    .populate('category', 'name slug description')
    .lean();

  if (!product) {
    throw new AppException('Không tìm thấy sản phẩm', 404);
  }

  const relatedProducts = await Product.find({
    isActive: true,
    category: product.category._id,
    _id: { $ne: product._id },
  })
    .populate('category', 'name slug')
    .sort({ soldQuantity: -1 })
    .limit(6)
    .lean();

  res.status(200).json(HttpResponse.success({
    product,
    relatedProducts,
  }, 'Lấy thông tin sản phẩm thành công'));
};

const getRelatedProducts = async (req, res) => {
  const { id } = req.params;
  const { limit = 6 } = req.query;

  const product = await Product.findById(id).lean();
  if (!product) {
    throw new AppException('Không tìm thấy sản phẩm', 404);
  }

  const relatedProducts = await Product.find({
    isActive: true,
    category: product.category,
    _id: { $ne: product._id },
  })
    .populate('category', 'name slug')
    .sort({ soldQuantity: -1 })
    .limit(Number(limit))
    .lean();

  res.status(200).json(HttpResponse.success(relatedProducts, 'Lấy sản phẩm tương tự thành công'));
};

module.exports = {
  getProducts,
  getNewProducts,
  getBestsellers,
  getMostViewed,
  getFeaturedProducts,
  getProductBySlug,
  getRelatedProducts,
};
