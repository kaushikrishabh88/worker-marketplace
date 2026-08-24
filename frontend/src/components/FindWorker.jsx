import {
  useEffect,
  useMemo,
  useState,
} from "react";

import WorkerCard from "./WorkerCard";
import { useToast } from "./useToast";
import API_URL from "../api";

function FindWorker() {
  const { error: showError } =
    useToast();

  const [workers, setWorkers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [
    fetchError,
    setFetchError,
  ] = useState("");

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    selectedSkill,
    setSelectedSkill,
  ] = useState("");

  const [
    selectedLocation,
    setSelectedLocation,
  ] = useState("");

  const [
    sortBy,
    setSortBy,
  ] = useState("relevant");

  /* =========================================================
     FETCH WORKERS
  ========================================================= */

  useEffect(() => {
    const fetchWorkers =
      async () => {
        try {
          setLoading(true);
          setFetchError("");

          const response =
            await fetch(
              `${API_URL}/api/workers`,
            );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data.message ||
                "Failed to fetch workers.",
            );
          }

          setWorkers(
            data.workers || [],
          );
        } catch (error) {
          console.error(
            "Fetch workers error:",
            error,
          );

          const message =
            error.message ||
            "Failed to fetch workers.";

          setFetchError(message);

          showError(message);
        } finally {
          setLoading(false);
        }
      };

    fetchWorkers();
  }, [showError]);

  /* =========================================================
     POPULAR SKILL EVENT
     Receives selected skill from App.jsx
  ========================================================= */

  useEffect(() => {
    const handlePopularSkill = (
      event,
    ) => {
      const skill =
        event?.detail?.skill;

      if (!skill) {
        return;
      }

      /*
       * Clear other filters so
       * Popular Skill click always
       * shows useful results.
       */

      setSearchTerm("");
      setSelectedLocation("");
      setSortBy("relevant");

      setSelectedSkill(skill);
    };

    window.addEventListener(
      "workmate:filter-workers",
      handlePopularSkill,
    );

    return () => {
      window.removeEventListener(
        "workmate:filter-workers",
        handlePopularSkill,
      );
    };
  }, []);

  /* =========================================================
     FILTER + SORT WORKERS
  ========================================================= */

  const filteredWorkers =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      const result =
        workers.filter(
          (worker) => {
            const name =
              worker.name
                ?.toLowerCase() ||
              "";

            const role =
              worker.role
                ?.toLowerCase() ||
              "";

            const location =
              worker.location
                ?.toLowerCase() ||
              "";

            const skills =
              Array.isArray(
                worker.skills,
              )
                ? worker.skills
                : [];

            const matchesSearch =
              !search ||
              name.includes(
                search,
              ) ||
              role.includes(
                search,
              ) ||
              location.includes(
                search,
              ) ||
              skills.some(
                (skill) =>
                  skill
                    .toLowerCase()
                    .includes(
                      search,
                    ),
              );

            const matchesSkill =
              !selectedSkill ||
              skills.some(
                (skill) =>
                  skill
                    .toLowerCase() ===
                  selectedSkill
                    .toLowerCase(),
              );

            const matchesLocation =
              !selectedLocation ||
              location ===
                selectedLocation
                  .toLowerCase();

            return (
              matchesSearch &&
              matchesSkill &&
              matchesLocation
            );
          },
        );

      if (
        sortBy === "rating"
      ) {
        return [
          ...result,
        ].sort(
          (a, b) =>
            Number(
              b.rating || 0,
            ) -
            Number(
              a.rating || 0,
            ),
        );
      }

      if (
        sortBy ===
        "experience"
      ) {
        return [
          ...result,
        ].sort(
          (a, b) =>
            parseInt(
              b.experience ||
                "0",
              10,
            ) -
            parseInt(
              a.experience ||
                "0",
              10,
            ),
        );
      }

      return result;
    }, [
      workers,
      searchTerm,
      selectedSkill,
      selectedLocation,
      sortBy,
    ]);

  /* =========================================================
     CLEAR FILTERS
  ========================================================= */

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedSkill("");
    setSelectedLocation("");
    setSortBy("relevant");
  };

  /* =========================================================
     SCROLL TO RESULTS
  ========================================================= */

  const scrollToResults = () => {
    document
      .querySelector(
        ".worker-list",
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <section
      className="find-worker-page"
      id="find-workers"
    >
      {/* =====================================================
          HEADING
      ===================================================== */}

      <div className="find-worker-heading">
        <span>
          FIND SKILLED WORKERS
        </span>

        <h1>
          Find the right person
          for your business.
        </h1>

        <p>
          Search skilled workers
          by skill, location,
          experience, and
          availability.
        </p>
      </div>

      {/* =====================================================
          SEARCH
      ===================================================== */}

      <div className="worker-search">
        {/* SEARCH TERM */}

        <div className="search-field search-main">
          <label htmlFor="worker-search-term">
            Search
          </label>

          <input
            id="worker-search-term"
            type="text"
            value={
              searchTerm
            }
            onChange={(
              event,
            ) =>
              setSearchTerm(
                event.target
                  .value,
              )
            }
            placeholder="Skill, role or worker name..."
          />
        </div>

        {/* SKILL */}

        <div className="search-field">
          <label htmlFor="worker-skill-filter">
            Skill
          </label>

          <select
            id="worker-skill-filter"
            value={
              selectedSkill
            }
            onChange={(
              event,
            ) =>
              setSelectedSkill(
                event.target
                  .value,
              )
            }
          >
            <option value="">
              All Skills
            </option>

            <option value="baker">
              Baker
            </option>

            <option value="chef">
              Chef
            </option>

            <option value="fast-food">
              Fast Food
            </option>

            <option value="halwai">
              Halwai
            </option>

            <option value="helper">
              Helper
            </option>
          </select>
        </div>

        {/* LOCATION */}

        <div className="search-field">
          <label htmlFor="worker-location-filter">
            Location
          </label>

          <select
            id="worker-location-filter"
            value={
              selectedLocation
            }
            onChange={(
              event,
            ) =>
              setSelectedLocation(
                event.target
                  .value,
              )
            }
          >
            <option value="">
              All Locations
            </option>

            <option value="Moradabad">
              Moradabad
            </option>

            <option value="Meerut">
              Meerut
            </option>

            <option value="Delhi">
              Delhi
            </option>
          </select>
        </div>

        {/* SEARCH BUTTON */}

        <button
          className="worker-search-btn"
          type="button"
          onClick={
            scrollToResults
          }
        >
          Search Workers

          <span>
            →
          </span>
        </button>
      </div>

      {/* =====================================================
          RESULTS HEADER
      ===================================================== */}

      <div className="worker-results-header">
        <div>
          <span className="results-label">
            WORKER DIRECTORY
          </span>

          <h2>
            Available Workers (
            {loading
              ? "..."
              : filteredWorkers.length}
            )
          </h2>

          <p>
            Browse workers
            matching your
            requirements.
          </p>
        </div>

        <select
          className="worker-sort"
          value={sortBy}
          onChange={(
            event,
          ) =>
            setSortBy(
              event.target
                .value,
            )
          }
          aria-label="Sort workers"
        >
          <option value="relevant">
            Most Relevant
          </option>

          <option value="rating">
            Highest Rated
          </option>

          <option value="experience">
            Most Experienced
          </option>
        </select>
      </div>

      {/* =====================================================
          WORKER LIST
      ===================================================== */}

      <div className="worker-list">
        {loading ? (
          <div className="empty-workers">
            <h3>
              Loading workers...
            </h3>

            <p>
              Please wait while
              we load available
              workers.
            </p>
          </div>
        ) : fetchError ? (
          <div className="empty-workers">
            <div className="empty-workers-icon">
              ⚠️
            </div>

            <span className="empty-badge">
              ERROR
            </span>

            <h3>
              Unable to load
              workers
            </h3>

            <p>
              {fetchError}
            </p>
          </div>
        ) : filteredWorkers.length >
          0 ? (
          filteredWorkers.map(
            (worker) => (
              <WorkerCard
                key={
                  worker._id
                }
                worker={
                  worker
                }
              />
            ),
          )
        ) : (
          <div className="empty-workers">
            <div className="empty-workers-icon">
              🔎
            </div>

            <span className="empty-badge">
              NO MATCH FOUND
            </span>

            <h3>
              No workers found
            </h3>

            <p>
              Try changing your
              search, skill, or
              location filters.
            </p>

            <button
              className="list-worker-btn"
              type="button"
              onClick={
                clearFilters
              }
            >
              Clear Filters

              <span>
                ↻
              </span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default FindWorker;