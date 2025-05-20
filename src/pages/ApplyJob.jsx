import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppContext } from "../content/AppContext";
import Loading from "../component/Loading";
import Navbar from "../component/Navbar";
import { assets } from "../assets/assets";
import kconvert from 'k-convert';
import moment from 'moment';
import JobCard from "../component/JobCard";
import Footer from "../component/Footer";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "@clerk/clerk-react";

const ApplyJob = () => {
    
    const { id } = useParams()

    const { getToken } = useAuth()

    const navigate = useNavigate()

    const [JobData,setJobData] = useState(null)
    const [isAlreadyApplied, setIsAlreadyApplied] = useState(false)

    const {jobs,backendUrl,userData, userApplications, fetchUserApplications } = useContext(AppContext)

    const  fetchJob = async () => {

     try {
            console.log("Fetching job with ID:", id);

            if (!id) {
                toast.error("Invalid job ID");
                return;
            }

            const {data} = await axios.get(backendUrl+`/api/jobs/${id}`);

            console.log("Job data response:", data);

            if (data.success && data.job) {
                // Verify that the job has all required data
                if (!data.job.companyId) {
                    console.error("Job missing company data:", data.job);
                    toast.error("Job data is incomplete. Missing company information.");
                    return;
                }

                setJobData(data.job);
                console.log("Job data set successfully:", data.job.title);
            } else {
                console.error("Failed to fetch job:", data.message);
                toast.error(data.message || "Failed to load job details");
            }
        } catch (error) {
            console.error("Error fetching job:", error);
            toast.error(error.response?.data?.message || error.message || "Error loading job details");
        }        
    }

    const applyHandler = async () => {
        try {

            if (!userData) {
                return toast.error('Login to apply for jobs')
            }

            if (!userData.resume) {
                navigate('/applications')
                return toast.error('Upload resume to apply')
            }

            const token = await getToken()

            const {data} = await axios.post(backendUrl+'/api/users/apply',
                {jobId: JobData._id},
                {headers:{Authorization:`Bearer ${token}`}}
            )

            if (data.success) {
                toast.success(data.message)
                fetchUserApplications()
            }else{
                toast.error(data.message)
            }

        } catch (error) {
            toast.error(error.message)
        }
    }

    const checkAlreadyApplied = () => {

       try {
            if (!JobData || !JobData._id) {
                console.error("Cannot check if already applied: JobData or JobData._id is missing");
                return;
            }

            if (!userApplications || !Array.isArray(userApplications)) {
                console.error("Cannot check if already applied: userApplications is not an array");
                return;
            }

            // Check if any application has this job ID
            const hasApplied = userApplications.some(item =>
                item && item.jobId && item.jobId._id === JobData._id
            );

            console.log("Has user already applied:", hasApplied);
            setIsAlreadyApplied(hasApplied);
        } catch (error) {
            console.error("Error in checkAlreadyApplied:", error);
        }
    }

    useEffect(() =>{
            console.log("ApplyJob component mounted or ID changed:", id);
            fetchJob()

            // Return cleanup function
        return () => {
            console.log("ApplyJob component unmounted or ID changing");
            setJobData(null); // Reset job data when component unmounts or ID changes
        };
    },[id], backendUrl)  // Also re-fetch if backendUrl changes

    useEffect(() => {
        console.log("Checking if already applied. JobData:", !!JobData, "Applications:", userApplications.length);
        if (userApplications.length > 0 && JobData) {
            checkAlreadyApplied()
        }
    },[JobData, userApplications, id])

    // Check if JobData and required properties exist
    const isValidJobData = JobData &&
                          JobData.title &&
                          JobData.description &&
                          JobData.companyId &&
                          JobData.companyId.name;

    console.log("Rendering ApplyJob component. Valid job data:", isValidJobData);

    return isValidJobData ? (
        <>
            <Navbar></Navbar>

            <div className="min-h-screen flex flex-col py-10 container px-4 2xl:px-20 mx-auto">
                <div className="bg-white text-black rounded-lg w-ful">
                    <div className="flex justify-center md:justify-between flex-wrap gap-8 px-14 py-20 mb-6 bg-sky-50 border border-sky-400 rounded-xl">
                        <div className="flex flex-col md:flex-row items-center">
                            <img className="h-24 bg-white rounded-lg p-4 mr-4 max-md:mb-4 border" src={JobData.companyId?.image || assets.suitcase_icon} alt="Company Logo" />
                            onError={(e) => {
                                    e.target.src = assets.suitcase_icon; // Fallback image
                                }}
                            <div className="text-center md:text-left text-neutral-700">
                                <h1 className="text-2xl sm:text-4xl font-medium">{JobData.title}</h1>
                                <div className="flex flex-row flex-wrap max-md:justify-center gap-y-2 gap-6 items-center text-gray-600 mt-2">
                                    <span className="flex items-center gap-1">
                                        <img src={assets.suitcase_icon} alt="" />
                                        {JobData.companyId?.name || 'Company'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <img src={assets.location_icon} alt="" />
                                        {JobData.location || 'Location not specified'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <img src={assets.person_icon} alt="" />
                                        {JobData.level || 'Level not specified'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <img src={assets.money_icon} alt="" />
                                        CTC: {JobData.salary ? kconvert.convertTo(JobData.salary) : 'Not specified'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col justify-center text-end text-sm max-md:mx-auto max-md:text-center">
                            <button onClick={applyHandler} className="bg-blue-600 p-2.5 px-10 text-white rounded">{isAlreadyApplied ? 'Already Applied' : 'Apply Now'}</button>
                            <p className="mt-1 text-gray-600">Posted  {JobData.date ?moment(JobData.date).fromNow() : 'recently'}</p>
                        </div>

                    </div>

                    <div className="flex flex-col lg:flex-row justify-between items-start">
                        <div className="w-full lg:w-2/3 ">
                            <h2 className="font-bold text-2xl mb-4">Job description</h2>
                            <div
                                className="rich-text"
                                dangerouslySetInnerHTML={{__html: JobData.description || 'No description provided'}}
                            ></div>
                            <button
                                onClick={applyHandler}
                                className="bg-blue-600 p-2.5 px-10 text-white rounded mt-10"
                            >
                                {isAlreadyApplied ? 'Already Applied' : 'Apply Now'}
                            </button>
                        </div>
                        {/* Right Section More Jobs  */}
                         {JobData.companyId && jobs && jobs.length > 0 && (
                            <div className="w-full lg:w-1/3 mt-8 lg:mt-0 lg:ml-8 space-y-5">
                                <h2>More jobs from {JobData.companyId.name}</h2>
                                {jobs
                                    .filter(job => job && job._id && job._id !== JobData._id &&
                                                  job.companyId && job.companyId._id === JobData.companyId._id)
                                    .filter(job => {
                                        // Set of applied jobIds
                                        const appliedJobsIds = new Set(
                                            userApplications
                                                .filter(app => app && app.jobId)
                                                .map(app => app.jobId._id)
                                        );
                                        // Return true if the user has not already applied for this job
                                        return !appliedJobsIds.has(job._id);
                                    })
                                    .slice(0, 4)
                                    .map((job, index) => <JobCard key={index} job={job} />)
                                }
                                {jobs.filter(job =>
                                    job && job._id && job._id !== JobData._id &&
                                    job.companyId && job.companyId._id === JobData.companyId._id
                                ).length === 0 && (
                                    <p className="text-gray-500">No other jobs available from this company</p>
                                )}
                            </div>
                        )}   
                        </div>
                        
                        
                    </div>
                </div>
            <Footer></Footer>
        </>
    ):(
        <>
            <Navbar />
            <div className="min-h-screen flex flex-col items-center justify-center">
                <Loading />
                <p className="mt-4 text-gray-600">Loading job details...</p>
            </div>
            <Footer />
        </>
    )
}

export default ApplyJob