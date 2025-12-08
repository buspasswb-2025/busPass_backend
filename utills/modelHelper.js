export const paginate = async (Model, query = {}, page = 1, limit = 10, sort = { createdAt: -1 }) => {
  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    Model.find(query)
    .populate({
      path: 'trip',
      select: 'date',
      populate: {
        path: 'bus',
        select: 'busName busNumber'
      }
    })
    .sort(sort).skip(skip).limit(limit),
    Model.countDocuments(query)
  ]);

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    results
  };
};
