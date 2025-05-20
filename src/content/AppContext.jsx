import { createContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth, useUser } from "@clerk/clerk-react";

export const AppContext = createContext()

export const AppContextProvider = (props) => {

    const backendUrl = import.meta.env.VITE_BACKEND_URL

    const {user} = useUser()
    const {getToken} = useAuth()

    const [searchFilter, setSearchFilter] = useState({
        title:'',
        location:''
    })

    const [isSearched,setIsSearched] = useState(false)

    const [jobs, setJobs] = useState([])

    const [showRecruiterLogin,setShowRecruiterLogin] = useState(false)

    const [companyToken,setCompanyToken] = useState(null)
    const [companyData,setCompanyData] = useState(null)

    const [userData,setUserData] = useState(null) 
    const [userApplications,setUserApplications] = useState([]) 

   // Function to create user if not exists
    const createUserIfNotExists = async () => {
        try {
            if (!user) return;

            const token = await getToken();
            if (!token) {
                console.error("No token available");
                return;
            }

            console.log("Creating user with data:", {
                firstName: user?.firstName,
                lastName: user?.lastName,
                email: user?.primaryEmailAddress?.emailAddress,
                image: user?.imageUrl
            });

            const response = await axios.post(`${backendUrl}/api/users/create-user`, {
                firstName: user?.firstName,
                lastName: user?.lastName,
                email: user?.primaryEmailAddress?.emailAddress,
                image: user?.imageUrl
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                console.log("User created or updated successfully");
                return true;
            } else {
                console.error("User creation failed:", response.data.message);
                return false;
            }
        } catch (err) {
            console.error("User creation error:", err);
            toast.error("User creation failed: " + (err.response?.data?.message || err.message));
            return false;
        }
    };

    // Effect to handle user login and data fetching
    useEffect(() => {
        const handleUserLogin = async () => {
            if (!user) return;

            try {
                // First try to fetch user data
                await fetchUserData();

                // If we get here, user data was fetched successfully
                // Also fetch applications
                fetchUserApplications();
            } catch (error) {
                console.error("Error in user login flow:", error);
            }
        };

        handleUserLogin();
    }, [user]); 


    // Function to fetch jobs
    const fetchJobs = async () => {
        try {
            
            const {data} = await axios.get(backendUrl+'/api/jobs')

            if (data.success) {
                setJobs(data.jobs)
            }else{
                toast.error(data.message)
            }

        } catch (error) {
            toast.error(error.message)
        }
    }

    // Function to fetch company data
    const fetchCompanyData = async () => {
        try {
            
            const {data} = await axios.get(backendUrl+'/api/company/company',{headers:{token:companyToken}})

            if (data.success) {
                setCompanyData(data.company)
            }else{
                toast.error(data.message)
            }

        } catch (error) {
          toast.error(error.message)  
        }
    }

    // Function to fetch user data
    const fetchUserData = async () => {
        try {
            if (!user) return;

            const token = await getToken();
            if (!token) {
                console.error("No token available for fetchUserData");
                return;
            }

            const {data} = await axios.get(backendUrl+'/api/users/user',
                {headers:{Authorization:`Bearer ${token}`}});

            if (data.success) {
                setUserData(data.user);
                return true;
            } else {
                // Check if this is our special error code
                if (data.code === 'USER_NOT_FOUND_NEEDS_CREATION') {
                    console.log("User not found, attempting to create...");
                    // Try to create the user
                    const created = await createUserIfNotExists();
                    if (created) {
                        // If user was created successfully, try fetching again
                        return fetchUserData();
                    } else {
                        toast.error("Could not create user account. Please try logging out and in again.");
                    }
                } else {
                    // For other errors, just show the message
                    toast.error(data.message);
                }
                return false;
            }
        } catch (error) {
            console.error("Error in fetchUserData:", error);
            toast.error(error.response?.data?.message || error.message);
            return false;
        }
    }

    // Function to fetch users applied application data
   const fetchUserApplications = async () => {
        try {
            if (!user) return;

            const token = await getToken();
            if (!token) {
                console.error("No token available for fetchUserApplications");
                return;
            }

            const {data} = await axios.get(backendUrl+'/api/users/applications',
                {headers:{Authorization: `Bearer ${token}`}}
            );

            if (data.success) {
                setUserApplications(data.applications);
                return true;
            } else {
                // Only show error if it's not a "no applications" message
                if (data.message !== 'No job application found for this user') {
                    toast.error(data.message);
                }
                return false;
            }
        } catch (error) {
            console.error("Error in fetchUserApplications:", error);
            // Don't show toast for application errors as they're not critical
            // toast.error(error.response?.data?.message || error.message);
            return false;
        }
    }

    // Retrive Company Token From LocalStorage
    useEffect(() =>{
        fetchJobs()

        const storedCompanyToken = localStorage.getItem('companyToken')

        if (storedCompanyToken) {
            setCompanyToken(storedCompanyToken)
        }

    },[])

    // Fetch Company Data if Company Token is Available
    useEffect(() => {
        if (companyToken) {
            fetchCompanyData()
        }
    },[companyToken])

    // Fetch User's Applications & Data if User is Logged In
    useEffect(()=>{
        if (user) {
            fetchUserData()
            fetchUserApplications()
        }
    },[user])

    const value ={
        setSearchFilter, searchFilter,
        isSearched,setIsSearched,
        jobs, setJobs,
        showRecruiterLogin,setShowRecruiterLogin,
        companyToken,setCompanyToken,
        companyData,setCompanyData,
        backendUrl,
        userData, setUserData,
        userApplications, setUserApplications,
        fetchUserData,
        fetchUserApplications,
        createUserIfNotExists
    }

    return ( 
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    )
}